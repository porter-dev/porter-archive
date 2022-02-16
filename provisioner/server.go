package main

import (
	"fmt"
	"log"
	"net"

	"github.com/porter-dev/porter/provisioner/pb"
	"google.golang.org/grpc"
)

type provisionerServer struct {
	pb.UnimplementedProvisionerServer
}

func (s *provisionerServer) GetState(infra *pb.Infra, server pb.Provisioner_GetStateServer) error {
	server.Send(&pb.StateUpdate{
		ResourceId: "testing",
		Update:     "created",
	})

	return nil
}

func main() {
	lis, err := net.Listen("tcp", fmt.Sprintf("localhost:%d", 8082))

	if err != nil {
		log.Fatalf("failed to listen: %v", err)
	}

	fmt.Println("listening on 8082")

	grpcServer := grpc.NewServer()
	pb.RegisterProvisionerServer(grpcServer, &provisionerServer{})
	grpcServer.Serve(lis)
}
