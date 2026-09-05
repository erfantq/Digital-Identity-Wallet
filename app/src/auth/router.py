from fastapi import APIRouter, Depends, Query
from fastapi.security import OAuth2PasswordRequestForm
from sqlalchemy.orm import Session

from .dependencies import get_db
from app.src.common.auth_dependencies import CurrentUser, require_admin, require_super_admin
from .schemas import (
    RegisterRequest,
    RegisterResponse,
    LoginResponse,
)
from .service import (
    register_user,
    login_user,
    list_users,
    get_user_detail,
    get_admin_dashboard,
    list_admins,
    get_admin_detail,
    delete_admin,
)
from .enums import UserRoleEnum

router = APIRouter(
    prefix="/auth",
    tags=["auth"]
)

# ok
# Admin / super_admin registers a new user
@router.post("/register", response_model=RegisterResponse)
async def register(
    request: RegisterRequest,
    db: Session = Depends(get_db),
    current_user: CurrentUser = Depends(require_admin),
):
    return await register_user(
        db=db,
        username=request.username,
        password=request.password,
        email=request.email,
        role=request.role,
        current_user=current_user,
    )

# ok
@router.post("/login", response_model=LoginResponse)
def login(form_data: OAuth2PasswordRequestForm = Depends(), db: Session = Depends(get_db)):
    return login_user(
        db=db,
        username=form_data.username,
        password=form_data.password
    )


@router.get("/users")
def list_all_users(
    db: Session = Depends(get_db),
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    search: str | None = Query(None),
    role: UserRoleEnum | None = Query(None),
    _admin=Depends(require_admin),
):
    return list_users(
        db=db,
        page=page,
        page_size=page_size,
        search=search,
        role=role,
    )


@router.get("/users/{user_id}")
def get_user_by_id_endpoint(
    user_id: int,
    db: Session = Depends(get_db),
    _admin=Depends(require_admin),
):
    return get_user_detail(db=db, user_id=user_id)


@router.get("/admin/dashboard")
def admin_dashboard(
    db: Session = Depends(get_db),
    _admin=Depends(require_admin),
):
    return get_admin_dashboard(db=db)


@router.get("/admins")
def list_admin_users(
    db: Session = Depends(get_db),
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    search: str | None = Query(None),
    _super_admin: CurrentUser = Depends(require_super_admin),
):
    return list_admins(
        db=db,
        page=page,
        page_size=page_size,
        search=search,
    )


@router.get("/admins/{user_id}")
def get_admin_by_id(
    user_id: int,
    db: Session = Depends(get_db),
    _super_admin: CurrentUser = Depends(require_super_admin),
):
    return get_admin_detail(db=db, user_id=user_id)


@router.delete("/admins/{user_id}")
def delete_admin_user(
    user_id: int,
    db: Session = Depends(get_db),
    current_user: CurrentUser = Depends(require_super_admin),
):
    return delete_admin(db=db, user_id=user_id, current_user=current_user)
