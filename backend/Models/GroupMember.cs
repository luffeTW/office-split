using System.ComponentModel.DataAnnotations;

namespace backend.Models;

public class GroupMember
{
    public int Id { get; set; }
    
    [Required]
    public int GroupId { get; set; }
    
    [Required]
    public int UserId { get; set; }
    
    [Required]
    [MaxLength(20)]
    public string Role { get; set; } = "Member"; // Owner, Admin, Member
    
    public DateTime JoinedAt { get; set; } = DateTime.UtcNow;
    
    // Navigation properties
    public virtual Group Group { get; set; } = null!;
    public virtual User User { get; set; } = null!;
}
