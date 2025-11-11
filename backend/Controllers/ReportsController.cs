using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Authorization;
using backend.Models;
using backend.Services;

namespace backend.Controllers;

[ApiController]
[Route("api/[controller]")]
[Authorize]
public class ReportsController : ControllerBase
{
    private readonly IReportService _reportService;

    public ReportsController(IReportService reportService)
    {
        _reportService = reportService;
    }

    private int GetUserId()
    {
        var userIdClaim = User.FindFirst(System.Security.Claims.ClaimTypes.NameIdentifier);
        if (userIdClaim == null || !int.TryParse(userIdClaim.Value, out int userId))
            throw new UnauthorizedAccessException("無法識別用戶");
        return userId;
    }

    [HttpGet("group/{groupId}")]
    public async Task<ActionResult<ReportDto>> GetGroupReport(
        int groupId,
        [FromQuery] DateTime? startDate = null,
        [FromQuery] DateTime? endDate = null,
        [FromQuery] int? categoryId = null)
    {
        var userId = GetUserId();
        try
        {
            var report = await _reportService.GetGroupReportAsync(groupId, userId, startDate, endDate, categoryId);
            return Ok(report);
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

    [HttpGet("group/{groupId}/my-debts")]
    public async Task<ActionResult<MyDebtsDto>> GetMyDebts(
        int groupId,
        [FromQuery] DateTime? startDate = null,
        [FromQuery] DateTime? endDate = null,
        [FromQuery] int? categoryId = null)
    {
        var userId = GetUserId();
        try
        {
            var result = await _reportService.GetMyDebtsAsync(groupId, userId, startDate, endDate, categoryId);
            return Ok(result);
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

    [HttpGet("group/{groupId}/export/csv")]
    public async Task<IActionResult> ExportReportToCsv(
        int groupId,
        [FromQuery] DateTime? startDate = null,
        [FromQuery] DateTime? endDate = null,
        [FromQuery] int? categoryId = null)
    {
        var userId = GetUserId();
        try
        {
            var csvData = await _reportService.ExportReportToCsvAsync(groupId, userId, startDate, endDate, categoryId);
            return File(csvData, "text/csv", $"report_{groupId}_{DateTime.UtcNow:yyyyMMdd}.csv");
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

    [HttpGet("group/{groupId}/export/excel")]
    public async Task<IActionResult> ExportReportToExcel(
        int groupId,
        [FromQuery] DateTime? startDate = null,
        [FromQuery] DateTime? endDate = null,
        [FromQuery] int? categoryId = null)
    {
        var userId = GetUserId();
        try
        {
            var excelData = await _reportService.ExportReportToExcelAsync(groupId, userId, startDate, endDate, categoryId);
            return File(excelData, 
                "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", 
                $"report_{groupId}_{DateTime.UtcNow:yyyyMMdd}.xlsx");
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
