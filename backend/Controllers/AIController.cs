using backend.Models.Dtos;
using backend.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace backend.Controllers;

[Authorize]
[ApiController]
[Route("api/[controller]")]
public class AIController : ControllerBase
{
    private readonly IAIService _aiService;
    private readonly IConfiguration _configuration;

    public AIController(IAIService aiService, IConfiguration configuration)
    {
        _aiService = aiService;
        _configuration = configuration;
    }

    [HttpGet("config")]
    public IActionResult GetConfig()
    {
        var enabled = _configuration.GetValue<bool>("AI:Enabled");
        return Ok(new { enabled });
    }

    [HttpPost("parse-transaction")]
    public async Task<ActionResult<CreateTransactionDto>> ParseTransaction([FromBody] ParseTransactionRequest request)
    {
        var enabled = _configuration.GetValue<bool>("AI:Enabled");
        if (!enabled)
        {
            return StatusCode(403, "AI features are disabled.");
        }

        try
        {
            // Get current user ID from claims
            var userId = int.Parse(User.FindFirst("id")?.Value ?? "0");
            
            var result = await _aiService.ParseTransactionAsync(request.Text, request.GroupId, userId);
            return Ok(result);
        }
        catch (Exception ex)
        {
            return BadRequest(new { message = ex.Message });
        }
    }
}

public class ParseTransactionRequest
{
    public string Text { get; set; } = string.Empty;
    public int GroupId { get; set; }
}
