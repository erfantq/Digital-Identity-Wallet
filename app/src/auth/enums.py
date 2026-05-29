from sqlalchemy import Enum

class UserRoleEnum(str, Enum):
    USER = "user"
    ADMIN = "admin"
    STUDENT = "student"
    TEACHER = "teacher"