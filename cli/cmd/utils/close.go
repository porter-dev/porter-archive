package utils

import (
	"fmt"
	"os"
	"os/signal"
	"syscall"
)

func closeHandler(closer func() error) {
	sig := make(chan os.Signal)
	signal.Notify(sig, os.Interrupt, syscall.SIGTERM)
	go func() {
		<-sig
		err := closer()

		if err == nil {
			fmt.Println("shutdown successful")
			os.Exit(0)
		}

		fmt.Printf("shutdown unsuccessful: %s\n", err.Error())
		os.Exit(1)
	}()
}
