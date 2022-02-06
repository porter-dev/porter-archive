package handlers

// var s3Client *s3.Client
// var redisClient *redis.Client
// var eventProcessor *processor.EventProcessor

// func init() {
// 	BUCKET := os.Getenv("BUCKET")

// 	// construct redis client, fallback to localhost
// 	host := os.Getenv("REDIS_HOST")

// 	if host == "" {
// 		host = "localhost"
// 	}

// 	redisClient = redis.NewClient(
// 		host,
// 		"6379",
// 		os.Getenv("REDIS_USER"),
// 		os.Getenv("REDIS_PASS"),
// 		0,
// 	)

// 	s3Client = s3.NewS3Client(BUCKET)

// 	eventProcessor = processor.NewEventProcessor()
// }
