using Microsoft.EntityFrameworkCore;
using backend.Data;
using backend.Models;

namespace backend.Services;

public class GroupService : IGroupService
{
    private readonly ApplicationDbContext _context;

    public GroupService(ApplicationDbContext context)
    {
        _context = context;
    }

    public async Task<List<GroupDto>> GetUserGroupsAsync(int userId)
    {
        return await _context.GroupMembers
            .Where(gm => gm.UserId == userId)
            .Include(gm => gm.Group)
                .ThenInclude(g => g.Creator)
            .Include(gm => gm.Group)
                .ThenInclude(g => g.Members)
                    .ThenInclude(m => m.User)
            .Select(gm => new GroupDto
            {
                Id = gm.Group.Id,
                Name = gm.Group.Name,
                Description = gm.Group.Description,
                CreatedBy = gm.Group.CreatedBy,
                CreatorName = gm.Group.Creator.Username,
                CreatedAt = gm.Group.CreatedAt,
                Members = gm.Group.Members.Select(m => new GroupMemberDto
                {
                    Id = m.Id,
                    UserId = m.UserId,
                    Username = m.User.Username,
                    Email = m.User.Email,
                    Role = m.Role,
                    JoinedAt = m.JoinedAt
                }).ToList()
            })
            .ToListAsync();
    }

    public async Task<GroupDto?> GetGroupByIdAsync(int id, int userId)
    {
        var isMember = await IsUserMemberOfGroupAsync(id, userId);
        if (!isMember)
            return null;

        var group = await _context.Groups
            .Include(g => g.Creator)
            .Include(g => g.Members)
                .ThenInclude(m => m.User)
            .FirstOrDefaultAsync(g => g.Id == id);

        if (group == null) return null;

        return new GroupDto
        {
            Id = group.Id,
            Name = group.Name,
            Description = group.Description,
            CreatedBy = group.CreatedBy,
            CreatorName = group.Creator.Username,
            CreatedAt = group.CreatedAt,
            Members = group.Members.Select(m => new GroupMemberDto
            {
                Id = m.Id,
                UserId = m.UserId,
                Username = m.User.Username,
                Email = m.User.Email,
                Role = m.Role,
                JoinedAt = m.JoinedAt
            }).ToList()
        };
    }

    public async Task<GroupDto> CreateGroupAsync(CreateGroupDto createDto, int creatorId)
    {
        var group = new Group
        {
            Name = createDto.Name,
            Description = createDto.Description,
            CreatedBy = creatorId,
            CreatedAt = DateTime.UtcNow
        };

        _context.Groups.Add(group);
        await _context.SaveChangesAsync();

        // Add creator as owner
        var creatorMember = new GroupMember
        {
            GroupId = group.Id,
            UserId = creatorId,
            Role = "Owner",
            JoinedAt = DateTime.UtcNow
        };
        _context.GroupMembers.Add(creatorMember);

        // Add other members if specified
        if (createDto.MemberIds != null && createDto.MemberIds.Any())
        {
            var members = createDto.MemberIds
                .Where(id => id != creatorId)
                .Select(id => new GroupMember
                {
                    GroupId = group.Id,
                    UserId = id,
                    Role = "Member",
                    JoinedAt = DateTime.UtcNow
                });
            _context.GroupMembers.AddRange(members);
        }

        await _context.SaveChangesAsync();

        return await GetGroupByIdAsync(group.Id, creatorId) ?? throw new Exception("創建群組失敗");
    }

    public async Task<GroupDto?> UpdateGroupAsync(int id, UpdateGroupDto updateDto, int userId)
    {
        var isOwnerOrAdmin = await IsUserOwnerOrAdminAsync(id, userId);
        if (!isOwnerOrAdmin)
            throw new UnauthorizedAccessException("無權限修改此群組");

        var group = await _context.Groups.FindAsync(id);
        if (group == null)
            return null;

        if (!string.IsNullOrEmpty(updateDto.Name))
            group.Name = updateDto.Name;
        
        if (updateDto.Description != null)
            group.Description = updateDto.Description;

        await _context.SaveChangesAsync();
        return await GetGroupByIdAsync(id, userId);
    }

    public async Task<bool> DeleteGroupAsync(int id, int userId)
    {
        var isOwner = await _context.GroupMembers
            .AnyAsync(gm => gm.GroupId == id && gm.UserId == userId && gm.Role == "Owner");
        
        if (!isOwner)
            throw new UnauthorizedAccessException("只有群組擁有者可以刪除群組");

        var group = await _context.Groups.FindAsync(id);
        if (group == null)
            return false;

        _context.Groups.Remove(group);
        await _context.SaveChangesAsync();
        return true;
    }

    public async Task<GroupMemberDto> AddMemberAsync(int groupId, AddMemberDto addDto, int userId)
    {
        var isOwnerOrAdmin = await IsUserOwnerOrAdminAsync(groupId, userId);
        if (!isOwnerOrAdmin)
            throw new UnauthorizedAccessException("無權限添加成員");

        var exists = await _context.GroupMembers
            .AnyAsync(gm => gm.GroupId == groupId && gm.UserId == addDto.UserId);
        if (exists)
            throw new Exception("用戶已是群組成員");

        var member = new GroupMember
        {
            GroupId = groupId,
            UserId = addDto.UserId,
            Role = addDto.Role,
            JoinedAt = DateTime.UtcNow
        };

        _context.GroupMembers.Add(member);
        await _context.SaveChangesAsync();

        var user = await _context.Users.FindAsync(addDto.UserId);
        return new GroupMemberDto
        {
            Id = member.Id,
            UserId = member.UserId,
            Username = user?.Username ?? "",
            Email = user?.Email ?? "",
            Role = member.Role,
            JoinedAt = member.JoinedAt
        };
    }

    public async Task<bool> RemoveMemberAsync(int groupId, int memberId, int userId)
    {
        var isOwnerOrAdmin = await IsUserOwnerOrAdminAsync(groupId, userId);
        if (!isOwnerOrAdmin)
            throw new UnauthorizedAccessException("無權限移除成員");

        var member = await _context.GroupMembers
            .FirstOrDefaultAsync(gm => gm.GroupId == groupId && gm.Id == memberId);
        
        if (member == null)
            return false;

        if (member.Role == "Owner")
            throw new Exception("無法移除群組擁有者");

        _context.GroupMembers.Remove(member);
        await _context.SaveChangesAsync();
        return true;
    }

    public async Task<bool> IsUserMemberOfGroupAsync(int groupId, int userId)
    {
        return await _context.GroupMembers
            .AnyAsync(gm => gm.GroupId == groupId && gm.UserId == userId);
    }

    public async Task<bool> IsUserOwnerOrAdminAsync(int groupId, int userId)
    {
        return await _context.GroupMembers
            .AnyAsync(gm => gm.GroupId == groupId && 
                          gm.UserId == userId && 
                          (gm.Role == "Owner" || gm.Role == "Admin"));
    }
}
