using Microsoft.EntityFrameworkCore;
using backend.Data;
using backend.Models;

namespace backend.Services;

public class UserService : IUserService
{
    private readonly ApplicationDbContext _context;

    public UserService(ApplicationDbContext context)
    {
        _context = context;
    }

    public async Task<UserDto?> GetUserByIdAsync(int id)
    {
        var user = await _context.Users.FindAsync(id);
        if (user == null) return null;

        return new UserDto
        {
            Id = user.Id,
            Username = user.Username,
            Email = user.Email,
            CreatedAt = user.CreatedAt
        };
    }

    public async Task<UserDto?> GetUserByUsernameAsync(string username)
    {
        var user = await _context.Users
            .FirstOrDefaultAsync(u => u.Username == username);
        
        if (user == null) return null;

        return new UserDto
        {
            Id = user.Id,
            Username = user.Username,
            Email = user.Email,
            CreatedAt = user.CreatedAt
        };
    }

    public async Task<UserDto> UpdateUserAsync(int id, UpdateUserDto updateDto)
    {
        var user = await _context.Users.FindAsync(id);
        if (user == null)
            throw new Exception("用戶不存在");

        if (!string.IsNullOrEmpty(updateDto.Email))
        {
            if (await _context.Users.AnyAsync(u => u.Email == updateDto.Email && u.Id != id))
                throw new Exception("電子郵件已被使用");
            user.Email = updateDto.Email;
        }

        if (!string.IsNullOrEmpty(updateDto.Password))
        {
            user.PasswordHash = BCrypt.Net.BCrypt.HashPassword(updateDto.Password);
        }

        await _context.SaveChangesAsync();

        return new UserDto
        {
            Id = user.Id,
            Username = user.Username,
            Email = user.Email,
            CreatedAt = user.CreatedAt
        };
    }
}
