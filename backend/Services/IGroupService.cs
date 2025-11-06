using backend.Models;

namespace backend.Services;

public interface IGroupService
{
    Task<List<GroupDto>> GetAllGroupsAsync();
    Task<List<GroupDto>> GetUserGroupsAsync(int userId);
    Task<GroupDto?> GetGroupByIdAsync(int id, int userId);
    Task<GroupDto> CreateGroupAsync(CreateGroupDto createDto, int creatorId);
    Task<GroupDto?> UpdateGroupAsync(int id, UpdateGroupDto updateDto, int userId);
    Task<bool> DeleteGroupAsync(int id, int userId);
    Task<GroupMemberDto> AddMemberAsync(int groupId, AddMemberDto addDto, int userId);
    Task<bool> RemoveMemberAsync(int groupId, int memberId, int userId);
    Task<bool> IsUserMemberOfGroupAsync(int groupId, int userId);
    Task<bool> IsUserOwnerOrAdminAsync(int groupId, int userId);
}
