import bcrypt from 'bcryptjs';
import { connectDB } from './db';
import { User } from './models/User';
import { TagGroup } from './models/TagGroup';
import { Tag } from './models/Tag';
import { Task } from './models/Task';

export async function seedDatabase() {
  try {
    await connectDB();

    const existingUser = await User.findOne({ email: 'admin@local.dev' });
    if (existingUser) {
      console.log('Database already seeded');
      return;
    }

    const passwordHash = await bcrypt.hash('Admin12345!', 10);
    const user = await User.create({
      email: 'admin@local.dev',
      passwordHash,
      name: 'Admin User',
      role: 'admin',
      plan: 'pro',
      subscriptionStatus: 'active',
    });

    const tagGroups = await TagGroup.create([
      {
        userId: user._id,
        name: { en: 'Work', ar: 'عمل' },
        color: '#3b82f6',
        icon: 'briefcase',
      },
      {
        userId: user._id,
        name: { en: 'Personal', ar: 'شخصي' },
        color: '#8b5cf6',
        icon: 'user',
      },
      {
        userId: user._id,
        name: { en: 'Learning', ar: 'تعلم' },
        color: '#10b981',
        icon: 'book',
      },
    ]);

    const tags = [];

    tags.push(
      ...(await Tag.create([
        {
          userId: user._id,
          groupId: tagGroups[0]._id,
          name: { en: 'Meeting', ar: 'اجتماع' },
        },
        {
          userId: user._id,
          groupId: tagGroups[0]._id,
          name: { en: 'Development', ar: 'تطوير' },
        },
        {
          userId: user._id,
          groupId: tagGroups[0]._id,
          name: { en: 'Design', ar: 'تصميم' },
        },
      ]))
    );

    tags.push(
      ...(await Tag.create([
        {
          userId: user._id,
          groupId: tagGroups[1]._id,
          name: { en: 'Health', ar: 'صحة' },
        },
        {
          userId: user._id,
          groupId: tagGroups[1]._id,
          name: { en: 'Shopping', ar: 'تسوق' },
        },
        {
          userId: user._id,
          groupId: tagGroups[1]._id,
          name: { en: 'Home', ar: 'منزل' },
        },
      ]))
    );

    tags.push(
      ...(await Tag.create([
        {
          userId: user._id,
          groupId: tagGroups[2]._id,
          name: { en: 'Tutorial', ar: 'درس' },
        },
        {
          userId: user._id,
          groupId: tagGroups[2]._id,
          name: { en: 'Course', ar: 'دورة' },
        },
        {
          userId: user._id,
          groupId: tagGroups[2]._id,
          name: { en: 'Reading', ar: 'قراءة' },
        },
        {
          userId: user._id,
          groupId: tagGroups[2]._id,
          name: { en: 'Practice', ar: 'ممارسة' },
        },
      ]))
    );

    const now = new Date();
    const tomorrow = new Date(now);
    tomorrow.setDate(tomorrow.getDate() + 1);
    const nextWeek = new Date(now);
    nextWeek.setDate(nextWeek.getDate() + 7);
    const lastWeek = new Date(now);
    lastWeek.setDate(lastWeek.getDate() - 7);

    await Task.create([
      {
        userId: user._id,
        title: 'Complete project proposal',
        description: 'Write and submit the Q1 project proposal',
        status: 'todo',
        priority: 'high',
        dueDate: tomorrow,
        tags: [tags[0]._id, tags[1]._id],
        estimatedMinutes: 120,
        isPinned: true,
      },
      {
        userId: user._id,
        title: 'Team standup meeting',
        description: 'Daily standup with the development team',
        status: 'todo',
        priority: 'medium',
        dueDate: now,
        tags: [tags[0]._id],
        estimatedMinutes: 15,
      },
      {
        userId: user._id,
        title: 'Review pull requests',
        description: 'Review and merge pending pull requests',
        status: 'doing',
        priority: 'high',
        dueDate: now,
        tags: [tags[1]._id],
        estimatedMinutes: 60,
      },
      {
        userId: user._id,
        title: 'Update documentation',
        description: 'Update API documentation with new endpoints',
        status: 'todo',
        priority: 'low',
        dueDate: nextWeek,
        tags: [tags[1]._id],
        estimatedMinutes: 90,
      },
      {
        userId: user._id,
        title: 'Design new landing page',
        description: 'Create mockups for the new landing page',
        status: 'todo',
        priority: 'medium',
        dueDate: nextWeek,
        tags: [tags[2]._id],
        estimatedMinutes: 180,
      },
      {
        userId: user._id,
        title: 'Grocery shopping',
        description: 'Buy groceries for the week',
        status: 'todo',
        priority: 'medium',
        dueDate: tomorrow,
        tags: [tags[4]._id],
        estimatedMinutes: 60,
      },
      {
        userId: user._id,
        title: 'Gym workout',
        description: 'Evening workout session',
        status: 'done',
        priority: 'medium',
        dueDate: lastWeek,
        completedAt: lastWeek,
        tags: [tags[3]._id],
        estimatedMinutes: 60,
        actualMinutes: 55,
      },
      {
        userId: user._id,
        title: 'Fix kitchen sink',
        description: 'Call plumber to fix the leaking sink',
        status: 'todo',
        priority: 'urgent',
        dueDate: now,
        tags: [tags[5]._id],
        estimatedMinutes: 30,
      },
      {
        userId: user._id,
        title: 'Complete React course module 5',
        description: 'Watch videos and complete exercises',
        status: 'doing',
        priority: 'medium',
        dueDate: nextWeek,
        tags: [tags[6]._id, tags[7]._id],
        estimatedMinutes: 120,
      },
      {
        userId: user._id,
        title: 'Read Clean Code chapter 3',
        description: 'Read and take notes',
        status: 'todo',
        priority: 'low',
        dueDate: nextWeek,
        tags: [tags[8]._id],
        estimatedMinutes: 45,
      },
      {
        userId: user._id,
        title: 'Practice TypeScript exercises',
        description: 'Complete 10 exercises on TypeScript',
        status: 'done',
        priority: 'medium',
        dueDate: lastWeek,
        completedAt: lastWeek,
        tags: [tags[9]._id],
        estimatedMinutes: 90,
        actualMinutes: 85,
      },
      {
        userId: user._id,
        title: 'Prepare presentation slides',
        description: 'Create slides for the tech talk',
        status: 'todo',
        priority: 'high',
        dueDate: tomorrow,
        tags: [tags[0]._id],
        estimatedMinutes: 90,
        isPinned: true,
      },
      {
        userId: user._id,
        title: 'Code review session',
        description: 'Conduct code review with junior developers',
        status: 'done',
        priority: 'medium',
        dueDate: lastWeek,
        completedAt: lastWeek,
        tags: [tags[0]._id, tags[1]._id],
        estimatedMinutes: 60,
        actualMinutes: 70,
      },
      {
        userId: user._id,
        title: 'Update personal website',
        description: 'Add new projects to portfolio',
        status: 'todo',
        priority: 'low',
        dueDate: nextWeek,
        tags: [tags[1]._id, tags[2]._id],
        estimatedMinutes: 120,
      },
      {
        userId: user._id,
        title: 'Annual health checkup',
        description: 'Schedule and attend annual health checkup',
        status: 'todo',
        priority: 'high',
        dueDate: tomorrow,
        tags: [tags[3]._id],
        estimatedMinutes: 120,
      },
    ]);

    console.log('Database seeded successfully');
    console.log('Admin user: admin@local.dev / Admin12345!');
  } catch (error) {
    console.error('Error seeding database:', error);
    throw error;
  }
}
