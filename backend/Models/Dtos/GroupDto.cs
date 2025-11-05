namespace backend.Models;

public class GroupDto
{
    public int Id { get; set; }
    public string Name { get; set; } = string.Empty;
    public string? Description { get; set; }
    public int CreatedBy { get; set; }
    public string? CreatorName { get; set; }
    public DateTime CreatedAt { get; set; }
    public List<GroupMemberDto>? Members { get; set; }
}

public class CreateGroupDto
{
    public string Name { get; set; } = string.Empty;
    public string? Description { get; set; }
    public List<int>? MemberIds { get; set; }
}

public class UpdateGroupDto
{
    public string? Name { get; set; }
    public string? Description { get; set; }
}

public class GroupMemberDto
{
    public int Id { get; set; }
    public int UserId { get; set; }
    public string Username { get; set; } = string.Empty;
    public string Email { get; set; } = string.Empty;
    public string Role { get; set; } = string.Empty;
    public DateTime JoinedAt { get; set; }
}

public class AddMemberDto
{
    public int UserId { get; set; }
    public string Role { get; set; } = "Member";
}
