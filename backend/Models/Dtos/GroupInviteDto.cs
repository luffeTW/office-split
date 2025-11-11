namespace backend.Models;

public class GroupInviteDto
{
    public int Id { get; set; }
    public int GroupId { get; set; }
    public string GroupName { get; set; } = string.Empty;
    public string Token { get; set; } = string.Empty;
    public DateTime CreatedAt { get; set; }
    public DateTime? ExpiresAt { get; set; }
    public int? MaxUses { get; set; }
    public int Uses { get; set; }
    public bool IsActive { get; set; }
}

public class CreateInviteDto
{
    // 以小時為單位（可選），如不填代表不過期
    public int? TtlHours { get; set; }
    // 可使用次數上限（可選），如不填代表不限次
    public int? MaxUses { get; set; }
}

public class JoinByTokenResultDto
{
    public int GroupId { get; set; }
    public string GroupName { get; set; } = string.Empty;
    public bool Joined { get; set; }
    public string Message { get; set; } = string.Empty;
}
