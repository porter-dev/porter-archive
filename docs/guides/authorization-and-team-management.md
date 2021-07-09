Porter supports setting basic authorization permissions via for other members in a Porter project. At the moment, there are 3 roles that can be assigned in a Porter project:

- **Admin:** read/write access to all resources, ability to delete the project and manage team members.
- **Developer:** read/write access to applications, jobs, environment groups, cluster data, and integrations.
- **Viewer:** read access to applications, jobs, environment groups, and cluster data.

# Adding Collaborators

To add a new collaborator to a Porter project, you must be logged in with an **Admin** role. As an admin, you will see a **Settings** tab in the sidebar. Navigate to **Settings** and input the email of the user you would like to add. This will generate an invitation link for the user, which expires in 24 hours. The user will get an email to join the Porter project, but if the email is not delivered, you can copy the invite link and send it to them directly.

TODO: ADD SCREENSHOT

**DISCLAIMER**

The user has to register or access porter with the same email that the invitation was sent to.
If not, it will not be able to look your project.

# Changing Collaborator Permissions

To change an invite or collaborator role, you must be logged in with an **Admin** role. As an admin, you will se a **Settings** tab in the sidebar. Navigate to **Settings** and lookup on the table the invite/collaborator that you want to change it's role, then click the button **Edit** on the row. This will open a pop up that will allow you to select the new role for that invite/collaborator.

You will note that the user that created the project will not be displayed on the table, and you cannot change your own permissions.

TODO: ADD SCREENSHOT OF MODAL

# Removing Collaborators

To remove an invite or a collaborator, you must be logged in with an **Admin** role. As an admin, you will se a **Settings** tab in the sidebar. Navigate to **Settings** and lookup on the table the invite/collaborator that you want to change it's role, then click the button **Remove** when you're removing a collaborator, or **Delete invite** when you're removing an invite.

TODO: ADD SCREENSHOT OF TABLE WITH THE TWO DIFFERENT OPTIONS
