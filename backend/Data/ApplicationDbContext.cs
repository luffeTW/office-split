using Microsoft.EntityFrameworkCore;
using backend.Models;

namespace backend.Data;

public class ApplicationDbContext : DbContext
{
    public ApplicationDbContext(DbContextOptions<ApplicationDbContext> options)
        : base(options)
    {
    }

    public DbSet<User> Users { get; set; }
    public DbSet<Group> Groups { get; set; }
    public DbSet<GroupMember> GroupMembers { get; set; }
    public DbSet<Category> Categories { get; set; }
    public DbSet<Transaction> Transactions { get; set; }
    public DbSet<Split> Splits { get; set; }
    public DbSet<GroupInvite> GroupInvites { get; set; }

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        base.OnModelCreating(modelBuilder);

        // User configuration
        modelBuilder.Entity<User>(entity =>
        {
            entity.HasIndex(e => e.Username).IsUnique();
            entity.HasIndex(e => e.Email).IsUnique();
        });

        // Group configuration
        modelBuilder.Entity<Group>(entity =>
        {
            entity.HasOne(g => g.Creator)
                  .WithMany()
                  .HasForeignKey(g => g.CreatedBy)
                  .OnDelete(DeleteBehavior.Restrict);
        });

      // GroupInvite configuration
      modelBuilder.Entity<GroupInvite>(entity =>
      {
        entity.HasIndex(e => e.Token).IsUnique();
        entity.HasOne(gi => gi.Group)
            .WithMany()
            .HasForeignKey(gi => gi.GroupId)
            .OnDelete(DeleteBehavior.Cascade);
        entity.HasOne(gi => gi.Creator)
            .WithMany()
            .HasForeignKey(gi => gi.CreatedBy)
            .OnDelete(DeleteBehavior.Restrict);
      });

        // GroupMember configuration
        modelBuilder.Entity<GroupMember>(entity =>
        {
            entity.HasIndex(e => new { e.GroupId, e.UserId }).IsUnique();
            
            entity.HasOne(gm => gm.Group)
                  .WithMany(g => g.Members)
                  .HasForeignKey(gm => gm.GroupId)
                  .OnDelete(DeleteBehavior.Cascade);
            
            entity.HasOne(gm => gm.User)
                  .WithMany(u => u.GroupMembers)
                  .HasForeignKey(gm => gm.UserId)
                  .OnDelete(DeleteBehavior.Cascade);
        });

        // Category configuration
        modelBuilder.Entity<Category>(entity =>
        {
            entity.HasOne(c => c.User)
                  .WithMany()
                  .HasForeignKey(c => c.UserId)
                  .OnDelete(DeleteBehavior.SetNull);
        });

        // Transaction configuration
        modelBuilder.Entity<Transaction>(entity =>
        {
            entity.HasOne(t => t.Group)
                  .WithMany(g => g.Transactions)
                  .HasForeignKey(t => t.GroupId)
                  .OnDelete(DeleteBehavior.Cascade);
            
            entity.HasOne(t => t.User)
                  .WithMany(u => u.Transactions)
                  .HasForeignKey(t => t.UserId)
                  .OnDelete(DeleteBehavior.Restrict);
            
            entity.HasOne(t => t.Category)
                  .WithMany(c => c.Transactions)
                  .HasForeignKey(t => t.CategoryId)
                  .OnDelete(DeleteBehavior.Restrict);
        });

        // Split configuration
        modelBuilder.Entity<Split>(entity =>
        {
            entity.HasOne(s => s.Transaction)
                  .WithMany(t => t.Splits)
                  .HasForeignKey(s => s.TransactionId)
                  .OnDelete(DeleteBehavior.Cascade);
            
            entity.HasOne(s => s.User)
                  .WithMany(u => u.Splits)
                  .HasForeignKey(s => s.UserId)
                  .OnDelete(DeleteBehavior.Restrict);
        });
    }
}
