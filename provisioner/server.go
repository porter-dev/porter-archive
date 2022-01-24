package main

import (
	"fmt"
	"log"
	"net"

	"github.com/porter-dev/porter/provisioner/pb"
	"google.golang.org/grpc"

	pgrpc "github.com/porter-dev/porter/provisioner/server/grpc"
)

func main() {
	lis, err := net.Listen("tcp", fmt.Sprintf("localhost:%d", 8082))

	if err != nil {
		log.Fatalf("failed to listen: %v", err)
	}

	fmt.Println("listening on 8082")

	grpcServer := grpc.NewServer()
	pb.RegisterProvisionerServer(grpcServer, &pgrpc.ProvisionerServer{})
	grpcServer.Serve(lis)
}
