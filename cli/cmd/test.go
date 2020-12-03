package cmd

import (
	"context"
	"fmt"
	"io/ioutil"
	"os"
	"reflect"
	"strings"
	"text/tabwriter"
	"time"

	"k8s.io/apimachinery/pkg/runtime/schema"
	"k8s.io/client-go/dynamic"
	di "k8s.io/client-go/dynamic/dynamicinformer"
	"k8s.io/client-go/tools/cache"
	"k8s.io/client-go/tools/clientcmd"
	"k8s.io/client-go/util/jsonpath"

	"github.com/fatih/color"
	"github.com/porter-dev/porter/internal/kubernetes/local"
	"github.com/spf13/cobra"
	"gopkg.in/yaml.v2"

	metav1 "k8s.io/apimachinery/pkg/apis/meta/v1"
	"k8s.io/apimachinery/pkg/apis/meta/v1/unstructured"
)

type Object struct {
	Group    string `yaml:"Group"`
	Version  string `yaml:"Version"`
	Resource string `yaml:"Resource"`
}

type Field struct {
	Kind  string `yaml:"Kind"`
	Query string `yaml:"Query"`
}

type Operation struct {
	Kind   string   `yaml:"Kind"`
	Object *Object  `yaml:"Object"`
	Fields []*Field `yaml:"Fields"`
}

func getOperations() ([]*Operation, error) {
	ops := make([]*Operation, 0)

	yamlFile, err := ioutil.ReadFile("./cmd/test.yaml")

	if err != nil {
		return nil, err
	}

	err = yaml.Unmarshal(yamlFile, &ops)

	if err != nil {
		return nil, err
	}

	return ops, nil
}

func initTabWriterArgs(fields []*Field) (string, []interface{}) {
	firstArg := ""
	nextArgs := make([]interface{}, 0)

	for i, field := range fields {
		firstArg += "%s"

		if len(fields) > i+1 {
			firstArg += "\t"
		} else {
			firstArg += "\n"
		}

		nextArgs = append(nextArgs, strings.ToUpper(field.Kind))
	}

	return firstArg, nextArgs
}

func PrintList(op *Operation, items []unstructured.Unstructured) {
	w := new(tabwriter.Writer)
	w.Init(os.Stdout, 3, 8, 0, '\t', tabwriter.AlignRight)
	firstTWArg, twHeaders := initTabWriterArgs(op.Fields)
	fmt.Fprintf(w, firstTWArg, twHeaders...)

	for _, item := range items {
		printRes := make([]interface{}, 0)

		for _, field := range op.Fields {
			name := item.GetName()
			j := jsonpath.New(name)
			j.AllowMissingKeys(true)

			err := j.Parse(field.Query)

			if err != nil {
				fmt.Printf("could not parse query for object %s: error=%s", name, err)
				continue
			}

			fullResults, err := j.FindResults(item.Object)

			if err != nil {
				fmt.Printf("query error for object %s: error=%s", name, err)
				continue
			}

			res := make([]string, 0)
			for ix := range fullResults {
				for _, result := range fullResults[ix] {
					res = append(res, fmt.Sprintf("%v", reflect.ValueOf(result.Interface())))
				}
			}

			switch field.Kind {
			case "Title", "Status":
				printRes = append(printRes, strings.Join(res, ""))
			case "Array":
				printRes = append(printRes, strings.Join(res, ","))
			}
		}

		fmt.Fprintf(w, firstTWArg, printRes...)
	}

	w.Flush()
}

func PrintRead(op *Operation, item *unstructured.Unstructured) {
	w := new(tabwriter.Writer)
	w.Init(os.Stdout, 3, 8, 0, '\t', tabwriter.AlignRight)
	firstTWArg, twHeaders := initTabWriterArgs(op.Fields)
	fmt.Fprintf(w, firstTWArg, twHeaders...)

	printRes := make([]interface{}, 0)

	for _, field := range op.Fields {
		name := item.GetName()
		j := jsonpath.New(name)
		j.AllowMissingKeys(true)

		err := j.Parse(field.Query)

		if err != nil {
			fmt.Printf("could not parse query for object %s: error=%s", name, err)
			continue
		}

		fullResults, err := j.FindResults(item.Object)

		if err != nil {
			fmt.Printf("query error for object %s: error=%s", name, err)
			continue
		}

		res := make([]string, 0)
		for ix := range fullResults {
			for _, result := range fullResults[ix] {
				res = append(res, fmt.Sprintf("%v", reflect.ValueOf(result.Interface())))
			}
		}

		switch field.Kind {
		case "Title", "Status":
			printRes = append(printRes, strings.Join(res, ""))
		case "Array":
			printRes = append(printRes, strings.Join(res, ","))
		}
	}

	fmt.Fprintf(w, firstTWArg, printRes...)

	w.Flush()
}

func listOperation(client dynamic.Interface, op *Operation) {
	objRes := schema.GroupVersionResource{
		Group:    op.Object.Group,
		Version:  op.Object.Version,
		Resource: op.Object.Resource,
	}

	namespace := "default"

	fmt.Printf("Listing deployments in namespace %q:\n", namespace)

	list, err := client.Resource(objRes).Namespace(namespace).List(context.TODO(), metav1.ListOptions{})

	if err != nil {
		red := color.New(color.FgRed)
		red.Println("Error:", err.Error())
		os.Exit(1)
	}

	PrintList(op, list.Items)
}

var testCmd = &cobra.Command{
	Use:   "test",
	Short: "Testing",
	Run: func(cmd *cobra.Command, args []string) {

		contextName := "gke_porter-dev-273614_us-central1-f_c-cz2vr"
		rawBytes, err := local.GetKubeconfigFromHost("", []string{contextName})

		if err != nil {
			red := color.New(color.FgRed)
			red.Println("Error:", err.Error())
			os.Exit(1)
		}

		conf, err := clientcmd.NewClientConfigFromBytes(rawBytes)

		rawConf, err := conf.RawConfig()

		conf = clientcmd.NewDefaultClientConfig(rawConf, &clientcmd.ConfigOverrides{
			CurrentContext: contextName,
		})

		restConf, err := conf.ClientConfig()

		if err != nil {
			red := color.New(color.FgRed)
			red.Println("Error:", err.Error())
			os.Exit(1)
		}

		client, err := dynamic.NewForConfig(restConf)

		if err != nil {
			red := color.New(color.FgRed)
			red.Println("Error:", err.Error())
			os.Exit(1)
		}

		ops, err := getOperations()

		if err != nil {
			red := color.New(color.FgRed)
			red.Println("Error:", err.Error())
			os.Exit(1)
		}

		StreamDynamic(client, ops[0])

		// listOperation(client, ops[0])
	},
}

type Message struct {
	EventType string
	Object    interface{}
	Kind      string
}

func StreamDynamic(client dynamic.Interface, op *Operation) error {
	factory := di.NewDynamicSharedInformerFactory(
		client,
		10*time.Second,
	)

	objRes := schema.GroupVersionResource{
		Group:    op.Object.Group,
		Version:  op.Object.Version,
		Resource: op.Object.Resource,
	}

	informer := factory.ForResource(objRes).Informer()

	stopper := make(chan struct{})
	errorchan := make(chan error)
	defer close(errorchan)
	defer close(stopper)

	informer.AddEventHandler(cache.ResourceEventHandlerFuncs{
		UpdateFunc: func(oldObj, newObj interface{}) {
			u := newObj.(*unstructured.Unstructured)

			PrintRead(op, u)
		},
		DeleteFunc: func(obj interface{}) {
			u := obj.(*unstructured.Unstructured)

			PrintRead(op, u)
		},
	})

	// TODO -- websocket
	// go func() {
	// 	// listens for websocket closing handshake
	// 	for {
	// 		if _, _, err := conn.ReadMessage(); err != nil {
	// 			defer conn.Close()
	// 			defer close(stopper)
	// 			defer fmt.Println("Successfully closed controller status stream")
	// 			errorchan <- nil
	// 			return
	// 		}
	// 	}
	// }()

	go informer.Run(stopper)

	for {
		select {
		case err := <-errorchan:
			return err
		}
	}
}

func init() {
	rootCmd.AddCommand(testCmd)
}
