package cmd

import (
	"bufio"
	"errors"
	"fmt"
	"os"
	"os/signal"
	"strings"
	"syscall"

	"golang.org/x/crypto/ssh/terminal"
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

func promptPlaintext(prompt string) (string, error) {
	reader := bufio.NewReader(os.Stdin)

	fmt.Print(prompt)
	text, err := reader.ReadString('\n')

	if err != nil {
		return "", err
	}

	return strings.TrimSpace(text), nil
}

func promptPasswordWithConfirmation() (string, error) {
	fmt.Print("Password: ")
	pw, err := terminal.ReadPassword(0)
	fmt.Print("\r")

	if err != nil {
		return "", err
	}

	fmt.Print("Confirm password: ")
	confirmPw, err := terminal.ReadPassword(0)
	fmt.Print("\n")

	if strings.TrimSpace(string(pw)) != strings.TrimSpace(string(confirmPw)) {
		return "", errors.New("Passwords do not match")
	}

	return strings.TrimSpace(string(pw)), nil
}
