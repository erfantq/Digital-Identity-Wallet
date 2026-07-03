import math
from typing import Any


def paginate(query, page: int = 1, page_size: int = 10) -> dict[str, Any]:
    total_items = query.count()

    items = (
        query
        .offset((page - 1) * page_size)
        .limit(page_size)
        .all()
    )

    total_pages = math.ceil(total_items / page_size) if total_items > 0 else 0

    return {
        "items": items,
        "pagination": {
            "page": page,
            "page_size": page_size,
            "total_items": total_items,
            "total_pages": total_pages,
            "has_next": page < total_pages,
            "has_previous": page > 1,
        }
    }