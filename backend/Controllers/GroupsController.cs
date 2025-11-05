using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Authorization;
using backend.Models;
using backend.Services;

namespace backend.Controllers;

[ApiController]
[Route("api/[controller]")]
[Authorize]
public class GroupsController : ControllerBase
{
    private readonly IGroupService _groupService;

    public GroupsController(IGroupService groupService)
    {
        _groupService = groupService;
    }

    private int GetUserId()
    {
        var userIdClaim = User.FindFirst(System.Security.Claims.ClaimTypes.NameIdentifier);
        if (userIdClaim == null || !int.TryParse(userIdClaim.Value, out int userId))
            throw new UnauthorizedAccessException("無法識別用戶");
        return userId;
    }

    [HttpGet]
    public async Task<ActionResult<List<GroupDto>>> GetUserGroups()
    {
        var userId = GetUserId();
        var groups = await _groupService.GetUserGroupsAsync(userId);
        return Ok(groups);
    }

    [HttpGet("{id}")]
    public async Task<ActionResult<GroupDto>> GetGroup(int id)
    {
        var userId = GetUserId();
        var group = await _groupService.GetGroupByIdAsync(id, userId);
        if (group == null)
            return NotFound();

        return Ok(group);
    }

    [HttpPost]
    public async Task<ActionResult<GroupDto>> CreateGroup([FromBody] CreateGroupDto createDto)
    {
        var userId = GetUserId();
        try
        {
            var group = await _groupService.CreateGroupAsync(createDto, userId);
            return CreatedAtAction(nameof(GetGroup), new { id = group.Id }, group);
        }
        catch (Exception ex)
        {
            return BadRequest(new { message = ex.Message });
        }
    }

    [HttpPut("{id}")]
    public async Task<ActionResult<GroupDto>> UpdateGroup(int id, [FromBody] UpdateGroupDto updateDto)
    {
        var userId = GetUserId();
        try
        {
            var group = await _groupService.UpdateGroupAsync(id, updateDto, userId);
            if (group == null)
                return NotFound();

            return Ok(group);
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

    [HttpDelete("{id}")]
    public async Task<IActionResult> DeleteGroup(int id)
    {
        var userId = GetUserId();
        try
        {
            var result = await _groupService.DeleteGroupAsync(id, userId);
            if (!result)
                return NotFound();

            return NoContent();
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

    [HttpPost("{groupId}/members")]
    public async Task<ActionResult<GroupMemberDto>> AddMember(int groupId, [FromBody] AddMemberDto addDto)
    {
        var userId = GetUserId();
        try
        {
            var member = await _groupService.AddMemberAsync(groupId, addDto, userId);
            return Ok(member);
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

    [HttpDelete("{groupId}/members/{memberId}")]
    public async Task<IActionResult> RemoveMember(int groupId, int memberId)
    {
        var userId = GetUserId();
        try
        {
            var result = await _groupService.RemoveMemberAsync(groupId, memberId, userId);
            if (!result)
                return NotFound();

            return NoContent();
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
