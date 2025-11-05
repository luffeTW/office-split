using backend.Models;

namespace backend.Services;

public interface IUserService
{
    Task<UserDto?> GetUserByIdAsync(int id);
    Task<UserDto?> GetUserByUsernameAsync(string username);
    Task<UserDto> UpdateUserAsync(int id, UpdateUserDto updateDto);
}

public class UpdateUserDto
{
    public string? Email { get; set; }
    public string? Password { get; set; }
}
