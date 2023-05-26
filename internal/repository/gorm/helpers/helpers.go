package helpers

import (
	"math"

	"gorm.io/gorm"
)

type PaginatedResult struct {
	NumPages    int64
	CurrentPage int64
	NextPage    int64 `json:"next_page,omitempty"`
}

func Paginate(db *gorm.DB, pagination *PaginatedResult, opts ...QueryOption) func(db *gorm.DB) *gorm.DB {
	q := Query{
		PageSize: 50,
		Page:     0,
	}

	for _, opt := range opts {
		opt(&q)
	}

	var totalRows int64
	db.Count(&totalRows)

	offset := (q.Page - 1) * q.PageSize

	pagination.NumPages = int64(math.Ceil(float64(totalRows) / float64(q.PageSize)))
	pagination.CurrentPage = int64(q.Page)
	pagination.NextPage = int64(q.Page + 1)
	if pagination.CurrentPage == pagination.NumPages {
		pagination.NextPage = pagination.CurrentPage
	}

	return func(db *gorm.DB) *gorm.DB {
		return db.
			Offset(offset).
			Limit(q.PageSize)
	}
}
