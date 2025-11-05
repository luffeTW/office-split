using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Authorization;
using backend.Models;
using backend.Services;

namespace backend.Controllers;

[ApiController]
[Route("api/[controller]")]
[Authorize]
public class CategoriesController : ControllerBase
{
    private readonly ICategoryService _categoryService;

    public CategoriesController(ICategoryService categoryService)
    {
        _categoryService = categoryService;
    }

    private int GetUserId()
    {
        var userIdClaim = User.FindFirst(System.Security.Claims.ClaimTypes.NameIdentifier);
        if (userIdClaim == null || !int.TryParse(userIdClaim.Value, out int userId))
            throw new UnauthorizedAccessException("無法識別用戶");
        return userId;
    }

    [HttpGet]
    public async Task<ActionResult<List<CategoryDto>>> GetCategories()
    {
        var userId = GetUserId();
        var categories = await _categoryService.GetCategoriesAsync(userId);
        return Ok(categories);
    }

    [HttpGet("{id}")]
    public async Task<ActionResult<CategoryDto>> GetCategory(int id)
    {
        var category = await _categoryService.GetCategoryByIdAsync(id);
        if (category == null)
            return NotFound();

        return Ok(category);
    }

    [HttpPost]
    public async Task<ActionResult<CategoryDto>> CreateCategory([FromBody] CreateCategoryDto createDto)
    {
        var userId = GetUserId();
        try
        {
            var category = await _categoryService.CreateCategoryAsync(createDto, userId);
            return CreatedAtAction(nameof(GetCategory), new { id = category.Id }, category);
        }
        catch (Exception ex)
        {
            return BadRequest(new { message = ex.Message });
        }
    }

    [HttpPut("{id}")]
    public async Task<ActionResult<CategoryDto>> UpdateCategory(int id, [FromBody] UpdateCategoryDto updateDto)
    {
        var userId = GetUserId();
        try
        {
            var category = await _categoryService.UpdateCategoryAsync(id, updateDto, userId);
            if (category == null)
                return NotFound();

            return Ok(category);
        }
        catch (UnauthorizedAccessException ex)
        {
            return Forbid(ex.Message);
        }
        catch (Exception ex)
        {
            return BadRequest(new { message = ex.Message });
        }
    }

    [HttpDelete("{id}")]
    public async Task<IActionResult> DeleteCategory(int id)
    {
        var userId = GetUserId();
        try
        {
            var result = await _categoryService.DeleteCategoryAsync(id, userId);
            if (!result)
                return NotFound();

            return NoContent();
        }
        catch (UnauthorizedAccessException ex)
        {
            return Forbid(ex.Message);
        }
        catch (Exception ex)
        {
            return BadRequest(new { message = ex.Message });
        }
    }
}
