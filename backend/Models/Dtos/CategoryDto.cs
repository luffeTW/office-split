namespace backend.Models;

public class CategoryDto
{
    public int Id { get; set; }
    public string Name { get; set; } = string.Empty;
    public string Type { get; set; } = string.Empty;
    public string? Icon { get; set; }
    public int? UserId { get; set; }
    public DateTime CreatedAt { get; set; }
}

public class CreateCategoryDto
{
    public string Name { get; set; } = string.Empty;
    public string Type { get; set; } = "Expense";
    public string? Icon { get; set; }
}

public class UpdateCategoryDto
{
    public string? Name { get; set; }
    public string? Type { get; set; }
    public string? Icon { get; set; }
}
