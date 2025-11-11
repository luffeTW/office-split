using Microsoft.EntityFrameworkCore;
using backend.Data;
using Npgsql;
using backend.Models;

namespace backend.Services;

public class GroupService : IGroupService
{
    private readonly ApplicationDbContext _context;

    public GroupService(ApplicationDbContext context)
    {
        _context = context;
    }

    public async Task<List<GroupDto>> GetAllGroupsAsync()
    {
        return await _context.Groups
            .Include(g => g.Creator)
            .Include(g => g.Members)
                .ThenInclude(m => m.User)
            .Select(g => new GroupDto
            {
                Id = g.Id,
                Name = g.Name,
                Description = g.Description,
                CreatedBy = g.CreatedBy,
                CreatorName = g.Creator.Username,
                CreatedAt = g.CreatedAt,
                Members = g.Members.Select(m => new GroupMemberDto
                {
                    Id = m.Id,
                    UserId = m.UserId,
                    Username = m.User.Username,
                    Email = m.User.Email,
                    Role = m.Role,
                    JoinedAt = m.JoinedAt
                }).ToList()
            })
            .OrderBy(g => g.Name)
            .ToListAsync();
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

    public async Task<GroupInviteDto> CreateInviteAsync(int groupId, int userId, int? ttlHours, int? maxUses)
    {
        var isOwnerOrAdmin = await IsUserOwnerOrAdminAsync(groupId, userId);
        if (!isOwnerOrAdmin)
            throw new UnauthorizedAccessException("無權限建立邀請");

        var token = Convert.ToBase64String(Guid.NewGuid().ToByteArray())
                        .TrimEnd('=')
                        .Replace('+', '-')
                        .Replace('/', '_');

        var invite = new GroupInvite
        {
            GroupId = groupId,
            CreatedBy = userId,
            Token = token,
            CreatedAt = DateTime.UtcNow,
            ExpiresAt = ttlHours.HasValue ? DateTime.UtcNow.AddHours(ttlHours.Value) : null,
            MaxUses = maxUses,
            Uses = 0,
            IsActive = true
        };

        _context.GroupInvites.Add(invite);
        await _context.SaveChangesAsync();

        var group = await _context.Groups.FindAsync(groupId) ?? throw new Exception("群組不存在");
        return new GroupInviteDto
        {
            Id = invite.Id,
            GroupId = groupId,
            GroupName = group.Name,
            Token = invite.Token,
            CreatedAt = invite.CreatedAt,
            ExpiresAt = invite.ExpiresAt,
            MaxUses = invite.MaxUses,
            Uses = invite.Uses,
            IsActive = invite.IsActive
        };
    }

    public async Task<GroupInviteDto?> GetInviteInfoAsync(string token)
    {
        var invite = await _context.GroupInvites
            .Include(i => i.Group)
            .FirstOrDefaultAsync(i => i.Token == token);
        if (invite == null) return null;

        return new GroupInviteDto
        {
            Id = invite.Id,
            GroupId = invite.GroupId,
            GroupName = invite.Group.Name,
            Token = invite.Token,
            CreatedAt = invite.CreatedAt,
            ExpiresAt = invite.ExpiresAt,
            MaxUses = invite.MaxUses,
            Uses = invite.Uses,
            IsActive = invite.IsActive
        };
    }

    public async Task<JoinByTokenResultDto> JoinByTokenAsync(string token, int userId)
    {
        var invite = await _context.GroupInvites.FirstOrDefaultAsync(i => i.Token == token);
        if (invite == null)
            return new JoinByTokenResultDto { Joined = false, Message = "邀請不存在" };

        if (!invite.IsActive)
            return new JoinByTokenResultDto { GroupId = invite.GroupId, Joined = false, Message = "邀請已停用" };

        if (invite.ExpiresAt.HasValue && invite.ExpiresAt.Value < DateTime.UtcNow)
            return new JoinByTokenResultDto { GroupId = invite.GroupId, Joined = false, Message = "邀請已過期" };

        if (invite.MaxUses.HasValue && invite.Uses >= invite.MaxUses.Value)
            return new JoinByTokenResultDto { GroupId = invite.GroupId, Joined = false, Message = "邀請次數已用完" };

        // 已是成員則直接回傳
        var alreadyMember = await _context.GroupMembers
            .AnyAsync(gm => gm.GroupId == invite.GroupId && gm.UserId == userId);
        if (alreadyMember)
        {
            var g = await _context.Groups.FindAsync(invite.GroupId);
            return new JoinByTokenResultDto { GroupId = invite.GroupId, GroupName = g?.Name ?? "", Joined = true, Message = "已在群組中" };
        }

        // 嘗試以交易處理，避免並發下重複插入造成唯一鍵衝突
        using var tx = await _context.Database.BeginTransactionAsync();
        try
        {
            // 交易中再次確認，避免競態
            var alreadyInTx = await _context.GroupMembers.AnyAsync(gm => gm.GroupId == invite.GroupId && gm.UserId == userId);
            if (alreadyInTx)
            {
                await tx.CommitAsync();
                var g0 = await _context.Groups.FindAsync(invite.GroupId);
                return new JoinByTokenResultDto { GroupId = invite.GroupId, GroupName = g0?.Name ?? string.Empty, Joined = true, Message = "已在群組中" };
            }

            // 加入成員
            var member = new GroupMember
            {
                GroupId = invite.GroupId,
                UserId = userId,
                Role = "Member",
                JoinedAt = DateTime.UtcNow
            };
            _context.GroupMembers.Add(member);

            // 更新邀請使用次數（以實際成功加入為準）
            invite.Uses += 1;
            if (invite.MaxUses.HasValue && invite.Uses >= invite.MaxUses.Value)
            {
                invite.IsActive = false; // 用罄後自動失效
            }

            await _context.SaveChangesAsync();
            await tx.CommitAsync();

            var group = await _context.Groups.FindAsync(invite.GroupId);
            return new JoinByTokenResultDto
            {
                GroupId = invite.GroupId,
                GroupName = group?.Name ?? string.Empty,
                Joined = true,
                Message = "加入成功"
            };
        }
        catch (DbUpdateException ex) when (ex.InnerException is PostgresException pex && pex.SqlState == "23505")
        {
            // 唯一鍵衝突（GroupId,UserId）視為已加入，回傳成功避免使用者看到錯誤
            await tx.RollbackAsync();
            var g = await _context.Groups.FindAsync(invite.GroupId);
            return new JoinByTokenResultDto { GroupId = invite.GroupId, GroupName = g?.Name ?? string.Empty, Joined = true, Message = "已在群組中" };
        }
    }

    public async Task<List<GroupInviteDto>> ListInvitesAsync(int groupId, int userId)
    {
        var isOwnerOrAdmin = await IsUserOwnerOrAdminAsync(groupId, userId);
        if (!isOwnerOrAdmin)
            throw new UnauthorizedAccessException("無權限查看邀請");

        return await _context.GroupInvites
            .Where(i => i.GroupId == groupId)
            .OrderByDescending(i => i.CreatedAt)
            .Select(invite => new GroupInviteDto
            {
                Id = invite.Id,
                GroupId = invite.GroupId,
                GroupName = invite.Group.Name,
                Token = invite.Token,
                CreatedAt = invite.CreatedAt,
                ExpiresAt = invite.ExpiresAt,
                MaxUses = invite.MaxUses,
                Uses = invite.Uses,
                IsActive = invite.IsActive
            }).ToListAsync();
    }

    public async Task<bool> DeactivateInviteAsync(string token, int userId)
    {
        var invite = await _context.GroupInvites.FirstOrDefaultAsync(i => i.Token == token);
        if (invite == null) return false;

        var isOwnerOrAdmin = await IsUserOwnerOrAdminAsync(invite.GroupId, userId);
        if (!isOwnerOrAdmin)
            throw new UnauthorizedAccessException("無權限停用邀請");

        if (!invite.IsActive) return true; // already inactive
        invite.IsActive = false;
        await _context.SaveChangesAsync();
        return true;
    }
}
