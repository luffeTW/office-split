using backend.Models;

namespace backend.Services;

public interface ICategoryService
{
    Task<List<CategoryDto>> GetCategoriesAsync(int? userId = null);
    Task<CategoryDto?> GetCategoryByIdAsync(int id);
    Task<CategoryDto> CreateCategoryAsync(CreateCategoryDto createDto, int userId);
    Task<CategoryDto?> UpdateCategoryAsync(int id, UpdateCategoryDto updateDto, int userId);
    Task<bool> DeleteCategoryAsync(int id, int userId);
    Task SeedDefaultCategoriesAsync();
}
