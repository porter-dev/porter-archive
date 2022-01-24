package main

import (
	"context"
	"log"
	"time"

	"github.com/porter-dev/porter/provisioner/pb"
	"google.golang.org/grpc"
)

// printFeature gets the feature for the given point.
func printStateUpdate(client pb.ProvisionerClient, infra *pb.Infra) {
	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()
	feature, err := client.GetState(ctx, infra)
	if err != nil {
		log.Fatalf("%v.GetFeatures(_) = _, %v: ", client, err)
	}
	stateUpdate, err := feature.Recv()

	if err != nil {
		log.Fatalf("%v.GetFeatures(_) = _, %v: ", client, err)
	}

	log.Println(stateUpdate)
}

func main() {
	serverAddr := "localhost:8082"
	conn, err := grpc.Dial(serverAddr, grpc.WithInsecure())
	if err != nil {
		log.Fatalf("fail to dial: %v", err)
	}
	defer conn.Close()
	client := pb.NewProvisionerClient(conn)

	printStateUpdate(client, &pb.Infra{
		Id: 1,
	})
}
