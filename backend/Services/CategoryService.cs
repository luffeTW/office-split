using Microsoft.EntityFrameworkCore;
using backend.Data;
using backend.Models;

namespace backend.Services;

public class CategoryService : ICategoryService
{
    private readonly ApplicationDbContext _context;

    public CategoryService(ApplicationDbContext context)
    {
        _context = context;
    }

    public async Task<List<CategoryDto>> GetCategoriesAsync(int? userId = null)
    {
        var query = _context.Categories.AsQueryable();
        
        // Get system categories (UserId == null) and user's custom categories
        query = query.Where(c => c.UserId == null || c.UserId == userId);

        return await query
            .Select(c => new CategoryDto
            {
                Id = c.Id,
                Name = c.Name,
                Type = c.Type,
                Icon = c.Icon,
                UserId = c.UserId,
                CreatedAt = c.CreatedAt
            })
            .OrderBy(c => c.UserId == null) // System categories first
            .ThenBy(c => c.Name)
            .ToListAsync();
    }

    public async Task<CategoryDto?> GetCategoryByIdAsync(int id)
    {
        var category = await _context.Categories.FindAsync(id);
        if (category == null) return null;

        return new CategoryDto
        {
            Id = category.Id,
            Name = category.Name,
            Type = category.Type,
            Icon = category.Icon,
            UserId = category.UserId,
            CreatedAt = category.CreatedAt
        };
    }

    public async Task<CategoryDto> CreateCategoryAsync(CreateCategoryDto createDto, int userId)
    {
        var category = new Category
        {
            Name = createDto.Name,
            Type = createDto.Type,
            Icon = createDto.Icon,
            UserId = userId,
            CreatedAt = DateTime.UtcNow
        };

        _context.Categories.Add(category);
        await _context.SaveChangesAsync();

        return new CategoryDto
        {
            Id = category.Id,
            Name = category.Name,
            Type = category.Type,
            Icon = category.Icon,
            UserId = category.UserId,
            CreatedAt = category.CreatedAt
        };
    }

    public async Task<CategoryDto?> UpdateCategoryAsync(int id, UpdateCategoryDto updateDto, int userId)
    {
        var category = await _context.Categories.FindAsync(id);
        if (category == null)
            return null;

        // Can only update own categories
        if (category.UserId != userId)
            throw new UnauthorizedAccessException("無權限修改此分類");

        if (!string.IsNullOrEmpty(updateDto.Name))
            category.Name = updateDto.Name;
        
        if (!string.IsNullOrEmpty(updateDto.Type))
            category.Type = updateDto.Type;
        
        if (updateDto.Icon != null)
            category.Icon = updateDto.Icon;

        await _context.SaveChangesAsync();

        return new CategoryDto
        {
            Id = category.Id,
            Name = category.Name,
            Type = category.Type,
            Icon = category.Icon,
            UserId = category.UserId,
            CreatedAt = category.CreatedAt
        };
    }

    public async Task<bool> DeleteCategoryAsync(int id, int userId)
    {
        var category = await _context.Categories.FindAsync(id);
        if (category == null)
            return false;

        // Can only delete own categories
        if (category.UserId != userId)
            throw new UnauthorizedAccessException("無權限刪除此分類");

        // Check if category is used in transactions
        var hasTransactions = await _context.Transactions.AnyAsync(t => t.CategoryId == id);
        if (hasTransactions)
            throw new Exception("無法刪除已被使用的分類");

        _context.Categories.Remove(category);
        await _context.SaveChangesAsync();
        return true;
    }

    public async Task SeedDefaultCategoriesAsync()
    {
        // Check if categories already exist
        if (await _context.Categories.AnyAsync(c => c.UserId == null))
            return;

        var defaultCategories = new List<Category>
        {
            // Expense categories
            new Category { Name = "餐飲", Type = "Expense", Icon = "🍽️", UserId = null, CreatedAt = DateTime.UtcNow },
            new Category { Name = "交通", Type = "Expense", Icon = "🚗", UserId = null, CreatedAt = DateTime.UtcNow },
            new Category { Name = "購物", Type = "Expense", Icon = "🛒", UserId = null, CreatedAt = DateTime.UtcNow },
            new Category { Name = "娛樂", Type = "Expense", Icon = "🎮", UserId = null, CreatedAt = DateTime.UtcNow },
            new Category { Name = "住宿", Type = "Expense", Icon = "🏠", UserId = null, CreatedAt = DateTime.UtcNow },
            new Category { Name = "醫療", Type = "Expense", Icon = "🏥", UserId = null, CreatedAt = DateTime.UtcNow },
            new Category { Name = "教育", Type = "Expense", Icon = "📚", UserId = null, CreatedAt = DateTime.UtcNow },
            new Category { Name = "其他支出", Type = "Expense", Icon = "💸", UserId = null, CreatedAt = DateTime.UtcNow },
            
            // Income categories
            new Category { Name = "薪資", Type = "Income", Icon = "💰", UserId = null, CreatedAt = DateTime.UtcNow },
            new Category { Name = "獎金", Type = "Income", Icon = "🎁", UserId = null, CreatedAt = DateTime.UtcNow },
            new Category { Name = "投資", Type = "Income", Icon = "📈", UserId = null, CreatedAt = DateTime.UtcNow },
            new Category { Name = "其他收入", Type = "Income", Icon = "💵", UserId = null, CreatedAt = DateTime.UtcNow }
        };

        _context.Categories.AddRange(defaultCategories);
        await _context.SaveChangesAsync();
    }
}
