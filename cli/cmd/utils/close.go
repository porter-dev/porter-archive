package utils

import (
	"os"
	"os/signal"
	"syscall"

	"github.com/fatih/color"
)

func closeHandler(closer func() error) {
	sig := make(chan os.Signal)
	signal.Notify(sig, os.Interrupt, syscall.SIGTERM)
	go func() {
		<-sig
		err := closer()

		if err == nil {
			color.New(color.FgRed).Println("shutdown successful")
			os.Exit(0)
		}

		color.New(color.FgRed).Fprintf(os.Stderr, "shutdown unsuccessful: %s\n", err.Error())
		os.Exit(1)
	}()
}
