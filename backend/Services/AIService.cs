using System.Net.Http.Headers;
using System.Text;
using System.Text.Json;
using backend.Models.Dtos;

namespace backend.Services;

public class AIService : IAIService
{
    private readonly HttpClient _httpClient;
    private readonly IConfiguration _configuration;
    private readonly IGroupService _groupService;
    private readonly ICategoryService _categoryService;

    public AIService(HttpClient httpClient, IConfiguration configuration, IGroupService groupService, ICategoryService categoryService)
    {
        _httpClient = httpClient;
        _configuration = configuration;
        _groupService = groupService;
        _categoryService = categoryService;
    }

    public async Task<CreateTransactionDto> ParseTransactionAsync(string input, int groupId, int userId)
    {
        var apiKey = _configuration["AI:ApiKey"];
        if (string.IsNullOrEmpty(apiKey))
        {
            throw new InvalidOperationException("AI API Key is not configured.");
        }

        // 1. Get Context Data
        var group = await _groupService.GetGroupByIdAsync(groupId, userId);
        if (group == null) throw new ArgumentException("Group not found");

        var categories = await _categoryService.GetCategoriesAsync();
        
        // Filter categories (optional: maybe only expense categories?)
        // For now, include all.

        // 2. Construct Prompt
        var membersList = string.Join(", ", group.Members.Select(m => $"{m.Username}(ID:{m.UserId})"));
        var categoriesList = string.Join(", ", categories.Select(c => $"{c.Name}(ID:{c.Id})"));

        var systemPrompt = $@"
You are a helpful assistant that parses natural language transaction descriptions into structured JSON data.
Current User ID: {userId}
Group Members: {membersList}
Categories: {categoriesList}

Rules:
1. Identify the Payer (who paid). If not specified, assume Current User (ID: {userId}).
2. Identify the Borrower (who owes money). If not specified, try to infer from context. If 'split with everyone', pick one representative or handle as split (currently system only supports single borrower for simple debt, or you can pick the most likely one). NOTE: The system currently requires a specific BorrowerUserId. If the input implies a group split, you might need to ask for clarification, but for now, try to identify a single borrower or default to a logic. 
   *Constraint*: Payer and Borrower MUST be different.
3. Identify the Amount.
4. Identify the Category. Match the closest category from the list. If unsure, pick 'General' or similar if exists, or the first one.
5. Identify the Date. Default to today ({DateTime.Now:yyyy-MM-dd}) if not specified.
6. Return JSON ONLY. No markdown formatting.
7. JSON Structure:
{{
  ""amount"": number,
  ""categoryId"": number,
  ""payerUserId"": number,
  ""borrowerUserId"": number,
  ""description"": string,
  ""date"": ""yyyy-MM-dd""
}}
";

        var userPrompt = $"Parse this: \"{input}\"";
        var fullPrompt = $"{systemPrompt}\n\n{userPrompt}";

        // 3. Call LLM API (Google Gemini)
        var requestBody = new
        {
            contents = new[]
            {
                new
                {
                    parts = new[]
                    {
                        new { text = fullPrompt }
                    }
                }
            },
            generationConfig = new
            {
                response_mime_type = "application/json"
            }
        };

        var jsonContent = new StringContent(JsonSerializer.Serialize(requestBody), Encoding.UTF8, "application/json");
        
        // Gemini API Key is passed in the URL query string
        var url = $"https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key={apiKey}";

        var response = await _httpClient.PostAsync(url, jsonContent);
        
        if (!response.IsSuccessStatusCode)
        {
            var error = await response.Content.ReadAsStringAsync();
            throw new Exception($"AI API Call failed: {response.StatusCode} - {error}");
        }

        var responseString = await response.Content.ReadAsStringAsync();
        using var doc = JsonDocument.Parse(responseString);
        
        // Gemini Response Structure: candidates[0].content.parts[0].text
        var content = doc.RootElement
            .GetProperty("candidates")[0]
            .GetProperty("content")
            .GetProperty("parts")[0]
            .GetProperty("text")
            .GetString();

        // Clean up markdown code blocks if present (Gemini might still wrap in ```json ... ``` even with mime_type set, sometimes)
        content = content.Replace("```json", "").Replace("```", "").Trim();

        var options = new JsonSerializerOptions { PropertyNameCaseInsensitive = true };
        var result = JsonSerializer.Deserialize<CreateTransactionDto>(content, options);

        if (result == null) throw new Exception("Failed to parse AI response.");

        // Fill missing fields if any
        result.GroupId = groupId;
        result.SplitEqually = true; // Default

        return result;
    }
}
