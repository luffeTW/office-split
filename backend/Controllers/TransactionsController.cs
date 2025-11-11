using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Authorization;
using Microsoft.EntityFrameworkCore;
using backend.Models;
using backend.Services;
using System.ComponentModel.DataAnnotations;
using Microsoft.AspNetCore.StaticFiles;

namespace backend.Controllers;

[ApiController]
[Route("api/[controller]")]
[Authorize]
public class TransactionsController : ControllerBase
{
    private readonly ITransactionService _transactionService;
    private readonly IWebHostEnvironment _env;

    public TransactionsController(ITransactionService transactionService, IWebHostEnvironment env)
    {
        _transactionService = transactionService;
        _env = env;
    }

    private int GetUserId()
    {
        var userIdClaim = User.FindFirst(System.Security.Claims.ClaimTypes.NameIdentifier);
        if (userIdClaim == null || !int.TryParse(userIdClaim.Value, out int userId))
            throw new UnauthorizedAccessException("無法識別用戶");
        return userId;
    }

    public class SettlePairDto
    {
        [Required]
        public int OtherUserId { get; set; }
        [Required]
        public string Direction { get; set; } = string.Empty; // IOwe 或 OweMe
        public DateTime? UpToDate { get; set; }
    }

    public class CreateTransactionWithReceiptForm
    {
        [Required]
        public int GroupId { get; set; }
        [Required]
        public int CategoryId { get; set; }
        [Required]
        public int PayerUserId { get; set; }
        [Required]
        public int BorrowerUserId { get; set; }
        [Required]
        [Range(typeof(decimal), "0.01", "79228162514264337593543950335")]
        public decimal Amount { get; set; }
        public string? Description { get; set; }
        public DateTime? Date { get; set; }
        public IFormFile? Receipt { get; set; }
    }

    [HttpPost("create-with-receipt")]
    [RequestSizeLimit(20 * 1024 * 1024)] // 20 MB
    public async Task<ActionResult<TransactionDto>> CreateWithReceipt([FromForm] CreateTransactionWithReceiptForm form)
    {
        var userId = GetUserId();
        try
        {
            string? receiptUrl = null;
            if (form.Receipt != null && form.Receipt.Length > 0)
            {
                // 僅允許影像類型
                var provider = new FileExtensionContentTypeProvider();
                var fileName = Path.GetFileName(form.Receipt.FileName);
                var ext = Path.GetExtension(fileName).ToLowerInvariant();
                var allowed = new[] { ".jpg", ".jpeg", ".png", ".gif", ".webp" };
                if (!allowed.Contains(ext))
                    return BadRequest(new { message = "僅支援 jpg/jpeg/png/gif/webp 格式" });

                // 目錄：wwwroot/uploads/receipts/{groupId}
                var root = _env.WebRootPath ?? Path.Combine(AppContext.BaseDirectory, "wwwroot");
                var targetDir = Path.Combine(root, "uploads", "receipts", form.GroupId.ToString());
                Directory.CreateDirectory(targetDir);

                var uniqueName = $"{DateTime.UtcNow:yyyyMMddHHmmssfff}_{Guid.NewGuid():N}{ext}";
                var savePath = Path.Combine(targetDir, uniqueName);
                using (var stream = System.IO.File.Create(savePath))
                {
                    await form.Receipt.CopyToAsync(stream);
                }

                // 產生相對網址，前端以 API Base 拼成完整網址
                var relativePath = $"/uploads/receipts/{form.GroupId}/{uniqueName}";
                receiptUrl = relativePath;
            }

            var dto = new CreateTransactionDto
            {
                GroupId = form.GroupId,
                CategoryId = form.CategoryId,
                PayerUserId = form.PayerUserId,
                BorrowerUserId = form.BorrowerUserId,
                Amount = form.Amount,
                Description = form.Description,
                Date = form.Date ?? DateTime.UtcNow,
                ReceiptUrl = receiptUrl
            };

            var transaction = await _transactionService.CreateTransactionAsync(dto, userId);
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

    [HttpPost("{id}/receipt")]
    [RequestSizeLimit(20 * 1024 * 1024)] // 20 MB
    public async Task<ActionResult<TransactionDto>> UploadReceipt(int id, [FromForm] IFormFile receipt)
    {
        var userId = GetUserId();
        try
        {
            if (receipt == null || receipt.Length == 0)
                return BadRequest(new { message = "未選擇檔案" });

            var provider = new FileExtensionContentTypeProvider();
            var fileName = Path.GetFileName(receipt.FileName);
            var ext = Path.GetExtension(fileName).ToLowerInvariant();
            var allowed = new[] { ".jpg", ".jpeg", ".png", ".gif", ".webp" };
            if (!allowed.Contains(ext))
                return BadRequest(new { message = "僅支援 jpg/jpeg/png/gif/webp 格式" });

            // 取得交易以取用 groupId
            var existing = await _transactionService.GetTransactionByIdAsync(id, userId);
            if (existing == null) return NotFound();

            var root = _env.WebRootPath ?? Path.Combine(AppContext.BaseDirectory, "wwwroot");
            var targetDir = Path.Combine(root, "uploads", "receipts", existing.GroupId.ToString());
            Directory.CreateDirectory(targetDir);

            var uniqueName = $"{DateTime.UtcNow:yyyyMMddHHmmssfff}_{Guid.NewGuid():N}{ext}";
            var savePath = Path.Combine(targetDir, uniqueName);
            using (var stream = System.IO.File.Create(savePath))
            {
                await receipt.CopyToAsync(stream);
            }
            var relativePath = $"/uploads/receipts/{existing.GroupId}/{uniqueName}";
            var updated = await _transactionService.UploadReceiptAsync(id, userId, relativePath);
            if (updated == null) return NotFound();
            return Ok(updated);
        }
        catch (UnauthorizedAccessException ex)
        {
            return Forbid(ex.Message);
        }
        catch (Exception ex)
        {
            var msg = ex.GetBaseException().Message ?? ex.Message;
            return BadRequest(new { message = msg });
        }
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

    [HttpPost("group/{groupId}/settle-pair")]
    public async Task<ActionResult<object>> SettlePair(int groupId, [FromBody] SettlePairDto dto)
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

            var updated = await _transactionService.SettlePairDebtsAsync(groupId, userId, dto.OtherUserId, dto.Direction, dto.UpToDate);
            return Ok(new { updated });
        }
        catch (UnauthorizedAccessException ex)
        {
            return Forbid(ex.Message);
        }
        catch (Exception ex)
        {
            var msg = ex.GetBaseException().Message ?? ex.Message;
            return BadRequest(new { message = msg });
        }
    }
}
