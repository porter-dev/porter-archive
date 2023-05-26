package helpers

type Query struct {
	PageSize int
	Page     int
}

type QueryOption func(*Query)

func WithPage(page int) func(q *Query) {
	if page == 0 {
		page = 1
	}
	return func(q *Query) {
		q.Page = page
	}
}

func WithPageSize(pageSize int) func(q *Query) {
	return func(q *Query) {
		q.PageSize = pageSize
	}
}
