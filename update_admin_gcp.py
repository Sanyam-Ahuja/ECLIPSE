import asyncio
import os
import sys

# Ensure the server directory is in PYTHONPATH if run outside the app folder
script_dir = os.path.dirname(os.path.abspath(__file__))
server_dir = os.path.join(script_dir, "server")
if os.path.exists(server_dir):
    sys.path.append(server_dir)

from sqlalchemy import select
from server.app.core.database import async_session
from server.app.models.user import User, UserRole

async def main():
    email = "sanyamcodeup@gmail.com"
    print(f"Attempting to promote {email} to admin...")
    
    try:
        async with async_session() as db:
            result = await db.execute(select(User).where(User.email == email))
            user = result.scalar_one_or_none()
            
            if user:
                print(f"User found: ID={user.id}, Current Role={user.role.value}")
                if user.role == UserRole.ADMIN:
                    print("User is already an admin. No changes needed.")
                else:
                    user.role = UserRole.ADMIN
                    await db.commit()
                    print(f"Success! {email} is now an ADMIN.")
            else:
                print(f"Error: User {email} not found in the database.")
                print("Ask the user to login once so their record is created, then run this script again.")
    except Exception as e:
        print(f"Database error: {e}")
        print("Make sure you run this script in an environment where DATABASE_URL is accessible.")

if __name__ == "__main__":
    asyncio.run(main())
