from enum import Enum

class UserRoleEnum(str, Enum):
    USER = "user"
    ADMIN = "admin"
    SUPER_ADMIN = "super_admin"
    STUDENT = "student"
    TEACHER = "teacher"