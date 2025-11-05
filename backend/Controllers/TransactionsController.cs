using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Authorization;
using Microsoft.EntityFrameworkCore;
using backend.Models;
using backend.Services;

namespace backend.Controllers;

[ApiController]
[Route("api/[controller]")]
[Authorize]
public class TransactionsController : ControllerBase
{
    private readonly ITransactionService _transactionService;

    public TransactionsController(ITransactionService transactionService)
    {
        _transactionService = transactionService;
    }

    private int GetUserId()
    {
        var userIdClaim = User.FindFirst(System.Security.Claims.ClaimTypes.NameIdentifier);
        if (userIdClaim == null || !int.TryParse(userIdClaim.Value, out int userId))
            throw new UnauthorizedAccessException("無法識別用戶");
        return userId;
    }

    [HttpGet("group/{groupId}")]
    public async Task<ActionResult<List<TransactionDto>>> GetTransactions(
        int groupId,
        [FromQuery] DateTime? startDate = null,
        [FromQuery] DateTime? endDate = null)
    {
        var userId = GetUserId();
        try
        {
            var transactions = await _transactionService.GetTransactionsAsync(groupId, userId, startDate, endDate);
            return Ok(transactions);
        }
        catch (UnauthorizedAccessException ex)
        {
            return Forbid(ex.Message);
        }
        catch (DbUpdateException dbEx)
        {
            var msg = dbEx.GetBaseException().Message ?? dbEx.Message;
            return BadRequest(new { message = msg });
        }
        catch (Exception ex)
        {
            var msg = ex.GetBaseException().Message ?? ex.Message;
            return BadRequest(new { message = msg });
        }
    }

    [HttpGet("{id}")]
    public async Task<ActionResult<TransactionDto>> GetTransaction(int id)
    {
        var userId = GetUserId();
        try
        {
            var transaction = await _transactionService.GetTransactionByIdAsync(id, userId);
            if (transaction == null)
                return NotFound();

            return Ok(transaction);
        }
        catch (UnauthorizedAccessException ex)
        {
            return Forbid(ex.Message);
        }
        catch (DbUpdateException dbEx)
        {
            var msg = dbEx.GetBaseException().Message ?? dbEx.Message;
            return BadRequest(new { message = msg });
        }
        catch (Exception ex)
        {
            var msg = ex.GetBaseException().Message ?? ex.Message;
            return BadRequest(new { message = msg });
        }
    }

    [HttpPost]
    public async Task<ActionResult<TransactionDto>> CreateTransaction([FromBody] CreateTransactionDto createDto)
    {
        var userId = GetUserId();
        try
        {
            if (!ModelState.IsValid)
            {
                var errors = string.Join("; ", ModelState.Values
                    .SelectMany(v => v.Errors)
                    .Select(e => string.IsNullOrWhiteSpace(e.ErrorMessage) ? e.Exception?.Message : e.ErrorMessage)
                    .Where(m => !string.IsNullOrWhiteSpace(m)));
                return BadRequest(new { message = errors });
            }
            var transaction = await _transactionService.CreateTransactionAsync(createDto, userId);
            return CreatedAtAction(nameof(GetTransaction), new { id = transaction.Id }, transaction);
        }
        catch (UnauthorizedAccessException ex)
        {
            return Forbid(ex.Message);
        }
        catch (DbUpdateException dbEx)
        {
            var msg = dbEx.GetBaseException().Message ?? dbEx.Message;
            return BadRequest(new { message = msg });
        }
        catch (Exception ex)
        {
            var msg = ex.GetBaseException().Message ?? ex.Message;
            return BadRequest(new { message = msg });
        }
    }

    [HttpPut("{id}")]
    public async Task<ActionResult<TransactionDto>> UpdateTransaction(int id, [FromBody] UpdateTransactionDto updateDto)
    {
        var userId = GetUserId();
        try
        {
            var transaction = await _transactionService.UpdateTransactionAsync(id, updateDto, userId);
            if (transaction == null)
                return NotFound();

            return Ok(transaction);
        }
        catch (UnauthorizedAccessException ex)
        {
            return Forbid(ex.Message);
        }
        catch (DbUpdateException dbEx)
        {
            var msg = dbEx.InnerException?.Message ?? dbEx.Message;
            return BadRequest(new { message = msg });
        }
        catch (Exception ex)
        {
            return BadRequest(new { message = ex.Message });
        }
    }

    [HttpDelete("{id}")]
    public async Task<IActionResult> DeleteTransaction(int id)
    {
        var userId = GetUserId();
        try
        {
            var result = await _transactionService.DeleteTransactionAsync(id, userId);
            if (!result)
                return NotFound();

            return NoContent();
        }
        catch (UnauthorizedAccessException ex)
        {
            return Forbid(ex.Message);
        }
        catch (DbUpdateException dbEx)
        {
            var msg = dbEx.GetBaseException().Message ?? dbEx.Message;
            return BadRequest(new { message = msg });
        }
        catch (Exception ex)
        {
            var msg = ex.GetBaseException().Message ?? ex.Message;
            return BadRequest(new { message = msg });
        }
    }

    [HttpGet("{transactionId}/splits")]
    public async Task<ActionResult<List<SplitDto>>> GetTransactionSplits(int transactionId)
    {
        var userId = GetUserId();
        try
        {
            var splits = await _transactionService.GetTransactionSplitsAsync(transactionId, userId);
            return Ok(splits);
        }
        catch (UnauthorizedAccessException ex)
        {
            return Forbid(ex.Message);
        }
        catch (DbUpdateException dbEx)
        {
            var msg = dbEx.GetBaseException().Message ?? dbEx.Message;
            return BadRequest(new { message = msg });
        }
        catch (Exception ex)
        {
            var msg = ex.GetBaseException().Message ?? ex.Message;
            return BadRequest(new { message = msg });
        }
    }

    [HttpPut("splits/{splitId}")]
    public async Task<ActionResult<SplitDto>> UpdateSplit(int splitId, [FromBody] UpdateSplitDto updateDto)
    {
        var userId = GetUserId();
        try
        {
            var split = await _transactionService.UpdateSplitAsync(splitId, updateDto, userId);
            if (split == null)
                return NotFound();

            return Ok(split);
        }
        catch (UnauthorizedAccessException ex)
        {
            return Forbid(ex.Message);
        }
        catch (DbUpdateException dbEx)
        {
            var msg = dbEx.GetBaseException().Message ?? dbEx.Message;
            return BadRequest(new { message = msg });
        }
        catch (Exception ex)
        {
            var msg = ex.GetBaseException().Message ?? ex.Message;
            return BadRequest(new { message = msg });
        }
    }
}
