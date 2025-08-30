# Quick Start Guide

Get up and running with the AI Code Development Platform in less than 5 minutes! This guide will have you creating your first AI-powered project quickly.

!!! tip "Perfect for First-Time Users"
    This quick start is ideal if you want to experience the platform immediately. For comprehensive setup, see our [detailed guides](overview.md).

## Step 1: Create Your Account (2 minutes)

### Sign Up Process

1. **Visit** [platform.aicode.dev](https://platform.aicode.dev) 
2. **Click** "Sign Up Free"
3. **Choose** your sign-up method:

=== "GitHub Account"
    ```
    ✅ Recommended for developers
    ✅ Instant GitHub integration
    ✅ Automatic profile setup
    ```
    
    Click "Continue with GitHub" and authorize the application.

=== "Email Registration"
    ```
    📧 Email address
    🔒 Secure password (8+ characters)
    👤 Display name
    ```
    
    Fill out the form and verify your email address.

### Account Verification

- **GitHub users**: Automatically verified
- **Email users**: Check your email and click the verification link

## Step 2: Create Your First Project (2 minutes)

### Project Wizard

Once logged in, you'll see the project creation wizard:

1. **Choose Project Type**:
   
   ```
   📱 Mobile App (Android)    [Recommended for beginners]
   🌐 Web Application
   🖥️  Desktop Application
   ```

2. **Select Template**:
   
   === "To-Do App"
       Perfect for learning CRUD operations and UI components
       
   === "Weather App"
       Great for API integration and data visualization
       
   === "Chat App" 
       Excellent for real-time features and user interaction

3. **Project Configuration**:
   ```yaml
   Project Name: "My First AI App"
   Description: "Learning the AI Code Platform"
   Platform: Android
   Template: To-Do App
   ```

### AI Project Analysis

The platform will analyze your choices and create:

- **Project structure** optimized for your chosen platform
- **Development roadmap** with AI-suggested milestones  
- **Component library** tailored to your template
- **Testing strategy** with automated test generation

## Step 3: Generate Your First Component (1 minute)

### Component Generation

1. **Navigate** to the "Components" tab in your project
2. **Click** "Generate New Component"
3. **Describe** what you want:

!!! example "Example Component Request"
    ```
    Create a task list component that displays to-do items with 
    checkboxes, edit functionality, and delete buttons. Include 
    smooth animations and Material Design styling.
    ```

### AI Generation Process

Watch as the AI:

1. **Analyzes** your request and project context
2. **Generates** component code with best practices
3. **Creates** automated tests for the component
4. **Provides** integration instructions

### Review and Approval

The AI will present:

```kotlin
// Generated TaskList Component
@Composable
fun TaskListComponent(
    tasks: List<Task>,
    onTaskToggle: (String) -> Unit,
    onTaskEdit: (Task) -> Unit,
    onTaskDelete: (String) -> Unit
) {
    LazyColumn {
        items(tasks) { task ->
            TaskItem(
                task = task,
                onToggle = { onTaskToggle(task.id) },
                onEdit = { onTaskEdit(task) },
                onDelete = { onTaskDelete(task.id) }
            )
        }
    }
}
```

**Click "Accept & Integrate"** to add it to your project.

## Step 4: Preview Your App (1 minute)

### Instant Preview

1. **Click** the "Preview" button in your project dashboard
2. **Choose** preview method:

=== "Web Preview"
    ```
    🌐 Instant browser preview
    📱 Mobile viewport simulation
    🔄 Real-time updates
    ```

=== "Android Emulator"
    ```
    📱 Full Android experience
    🔧 Hardware simulation
    📊 Performance metrics
    ```

=== "Physical Device"
    ```
    📲 Scan QR code with your phone
    🔗 Install preview app
    ⚡ Live development sync
    ```

### Interactive Demo

Your generated app will include:

- ✅ **Functional task creation**
- ✅ **Task completion toggles**  
- ✅ **Edit and delete functionality**
- ✅ **Smooth animations**
- ✅ **Material Design styling**

## Congratulations! 🎉

You've successfully:

- ✅ Created an AI Code Platform account
- ✅ Generated your first project
- ✅ Created an AI-powered component
- ✅ Previewed your working application

## What's Next?

### Immediate Next Steps

<div class="next-actions">
  <div class="action-card">
    <h3>🎨 Customize Your App</h3>
    <p>Modify colors, fonts, and layouts using our design system</p>
    <a href="../guides/ai-customization/">Customize Now →</a>
  </div>
  
  <div class="action-card">
    <h3>➕ Add More Features</h3>
    <p>Generate additional components and screens</p>
    <a href="../guides/first-project/">Add Features →</a>
  </div>
  
  <div class="action-card">
    <h3>🚀 Deploy Your App</h3>
    <p>Deploy to app stores or web hosting</p>
    <a href="../guides/deployment/">Deploy Now →</a>
  </div>
</div>

### Learning Path

1. **[Complete Project Tutorial](../guides/first-project/)** - Build a full application
2. **[Team Collaboration](../guides/team-management/)** - Invite team members
3. **[Advanced Features](../features/overview/)** - Explore platform capabilities
4. **[Best Practices](../guides/optimization/)** - Optimize your workflow

## Free Tier Benefits

Your free account includes:

| Feature | Free Tier Limit |
|---------|----------------|
| Projects | 5 personal projects |
| AI Generations | 50 components/month |
| Preview Deployments | Unlimited |
| GitHub Integration | Full access |
| Community Support | Forum & Discord |

## Upgrade Options

Ready for more? Consider upgrading:

- **Developer Plan ($29/month)**: Unlimited projects, 500 AI generations
- **Team Plan ($99/month)**: Team collaboration, advanced features  
- **Enterprise Plan**: Custom pricing for large organizations

[View All Plans →](../pricing/tiers/)

## Troubleshooting

### Common Quick Start Issues

??? question "Can't see the project wizard?"
    Make sure JavaScript is enabled and try refreshing the page. Clear browser cache if needed.

??? question "GitHub integration not working?"
    Check that you've granted all necessary permissions during the OAuth process. You can re-authorize in Settings.

??? question "Component generation failed?"
    Ensure your description is clear and specific. Try using one of our example prompts first.

??? question "Preview not loading?"
    Check your browser's popup blocker and ensure ports 3000-3010 aren't blocked by your firewall.

## Get Help

- **💬 Live Chat**: Available during business hours
- **📖 Documentation**: Comprehensive guides and tutorials  
- **👥 Community**: Join 10,000+ developers in our Discord
- **🎯 Tutorials**: Step-by-step video guides

---

<div class="success-banner">
  <h3>🎉 Welcome to AI-Powered Development!</h3>
  <p>You're now part of a growing community of developers who are building better software faster with AI assistance. What will you build next?</p>
</div>

Ready to dive deeper? Check out our [comprehensive getting started guides](overview.md) or jump into [building your first full project](../guides/first-project/)!