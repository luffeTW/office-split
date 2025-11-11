using System.ComponentModel.DataAnnotations;

namespace backend.Models;

public class GroupInvite
{
    public int Id { get; set; }

    [Required]
    public int GroupId { get; set; }

    [Required]
    public int CreatedBy { get; set; }

    [Required]
    [MaxLength(80)]
    public string Token { get; set; } = string.Empty; // 唯一邀請代碼

    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

    public DateTime? ExpiresAt { get; set; }

    public int? MaxUses { get; set; }

    public int Uses { get; set; } = 0;

    public bool IsActive { get; set; } = true;

    // Navigation
    public virtual Group Group { get; set; } = null!;
    public virtual User Creator { get; set; } = null!;
}
