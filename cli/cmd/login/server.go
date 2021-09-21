package login

import (
	"encoding/json"
	"fmt"
	"net"
	"net/http"
	"net/url"
	"strings"
	"time"

	"github.com/porter-dev/porter/cli/cmd/utils"
)

func redirect(
	codechan chan string,
) func(http.ResponseWriter, *http.Request) {
	return func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Content-Type", "text/html; charset=utf-8")
		fmt.Fprint(w, successScreen)

		queryParams, err := url.ParseQuery(r.URL.RawQuery)

		if err != nil {
			return
		}

		if codeParam, exists := queryParams["code"]; exists && len(codeParam) > 0 {
			codechan <- queryParams["code"][0]
		}
	}
}

func Login(
	host string,
) (string, error) {
	listener, err := net.Listen("tcp", ":0")

	if err != nil {
		panic(err)
	}

	port := listener.Addr().(*net.TCPAddr).Port

	errorchan := make(chan error)
	codechan := make(chan string)

	go func() {
		http.HandleFunc("/", redirect(
			codechan,
		))

		err := http.Serve(listener, nil)
		errorchan <- err
	}()

	// open browser for host login
	var redirectHost string
	if utils.CheckIfWsl() {
		redirectHost = fmt.Sprintf("http://%s:%d", utils.GetWslHostName(), port)
	} else {
		redirectHost = fmt.Sprintf("http://localhost:%d", port)
	}

	loginURL := fmt.Sprintf("%s/api/cli/login?redirect=%s", host, url.QueryEscape(redirectHost))

	err = utils.OpenBrowser(loginURL)

	if err != nil {
		return "", fmt.Errorf("Could not open browser: %v", err)
	}

	for {
		select {
		case err = <-errorchan:
			return "", err
		case code := <-codechan:
			return ExchangeToken(host, code)
		}
	}
}

type ExchangeResponse struct {
	Token string `json:"token"`
}

func ExchangeToken(host, code string) (string, error) {
	req, err := http.NewRequest(
		"POST",
		fmt.Sprintf("%s/api/cli/login/exchange", host),
		strings.NewReader(fmt.Sprintf(`{"authorization_code": "%s"}`, code)),
	)

	if err != nil {
		return "", err
	}

	// create a request with the authorization code
	req.Header.Set("Content-Type", "application/json; charset=utf-8")
	req.Header.Set("Accept", "application/json; charset=utf-8")

	client := &http.Client{
		Timeout: time.Minute,
	}

	res, err := client.Do(req)

	if err != nil {
		return "", err
	}

	defer res.Body.Close()

	resp := &ExchangeResponse{}

	if err = json.NewDecoder(res.Body).Decode(resp); err != nil {
		return "", err
	}

	return resp.Token, nil
}

const successScreen = `
<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset='UTF-8'>
    <title>Porter | Login</title>
    <link href="https://fonts.googleapis.com/icon?family=Material+Icons" rel="stylesheet">
    <link href="https://fonts.googleapis.com/css?family=Work+Sans:400,500,600" rel="stylesheet">
    <link href="//cdnjs.cloudflare.com/ajax/libs/KaTeX/0.9.0/katex.min.css" rel="stylesheet" />
    <link href="https://fonts.googleapis.com/css2?family=Open+Sans:wght@600&display=swap" rel="stylesheet">
    <style>
      #logo {
        width: 80px;
        margin-top: -30px;
        margin-bottom: 40px;
      }

      #success {
        font-family: 'Open Sans', sans-serif;
        font-size: 18px;
        color: #CBCBD8;
        margin-bottom: 17px;
      }

      #subtitle {
        font-family: 'Open Sans', sans-serif;
        font-size: 14px;
        color: #CBCBD8;
      }

      body{
        margin: 0;
        padding: 0;
        width: 100%;
        height: 100vh;
        background: #f1f3f5;
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
      }

      #text {
        display: flex;
        height: 100vh;
        align-items: center;
        justify-content: center;
        text-align: center;
      }

      h2{
        color: #fff;
        font-size: 47px;
        line-height: 40px;
      }

      #container {
        left: 0px;
        top: -100px;
        height: calc(100vh + 100px);
        overflow: hidden;
        position: relative;
      }

      #animate{
        margin: 0 auto;
        width: 20px;
        overflow: visible;
        position: relative;
      }

      #all{
        overflow: hidden;
        height: 100vh;
        width: 100%;
        position: fixed;
      }

      #footer{
        color: #808080;
        text-decoration: none;
        position: fixed;
        width: 752px;
        bottom: 20px;
        align-content: center;
        float: none;
        margin-left: calc(50% - 376px);
      }

      a, p{
        text-decoration: none;
        color: #808080;
        letter-spacing: 6px;
        transition: all 0.5s ease-in-out;
        width: auto;
        float: left;
        margin: 0;
        margin-right: 9px;
      }

      a:hover{
        color: #fff;
        letter-spacing: 2px;
        transition: all 0.5s ease-in-out;
      }
    </style>
  </head>
  <body>
    <link href="https://fonts.googleapis.com/css?family=Oswald:600,700" rel="stylesheet"> 
    <div id="all">
    <div id="container">
      <div id="animate">
      </div>
    </div>
    </div>
    <noscript>You need to enable JavaScript to run this app.</noscript>
    <img id='logo' src='https://i.ibb.co/y64zfm5/porter.png'>
    <div id='success'>Authentication successful!</div>
    <div id='subtitle'>You can now close this window.</div>
    <script>
/*      setTimeout(function () {
        window.close();
      }, 1000)
      */

      var container = document.getElementById('animate');
      var emoji = ['🎉'];
      var circles = [];

      for (var i = 0; i < 15; i++) {
        addCircle(i * 550, [10 + 0, 300], emoji[Math.floor(Math.random() * emoji.length)]);
        addCircle(i * 550, [10 + 0, -300], emoji[Math.floor(Math.random() * emoji.length)]);
        addCircle(i * 550, [10 - 200, -300], emoji[Math.floor(Math.random() * emoji.length)]);
        addCircle(i * 550, [10 + 200, 300], emoji[Math.floor(Math.random() * emoji.length)]);
        addCircle(i * 550, [10 - 400, -300], emoji[Math.floor(Math.random() * emoji.length)]);
        addCircle(i * 550, [10 + 400, 300], emoji[Math.floor(Math.random() * emoji.length)]);
        addCircle(i * 550, [10 - 600, -300], emoji[Math.floor(Math.random() * emoji.length)]);
        addCircle(i * 550, [10 + 600, 300], emoji[Math.floor(Math.random() * emoji.length)]);
      }



      function addCircle(delay, range, color) {
        setTimeout(function() {
          var c = new Circle(range[0] + Math.random() * range[1], 80 + Math.random() * 4, color, {
            x: -0.15 + Math.random() * 0.3,
            y: 1 + Math.random() * 1
          }, range);
          circles.push(c);
        }, delay);
      }

      function Circle(x, y, c, v, range) {
        var _this = this;
        this.x = x;
        this.y = y;
        this.color = c;
        this.v = v;
        this.range = range;
        this.element = document.createElement('span');
        /*this.element.style.display = 'block';*/
        this.element.style.opacity = 0;
        this.element.style.position = 'absolute';
        this.element.style.fontSize = '26px';
        this.element.style.color = 'hsl('+(Math.random()*360|0)+',80%,50%)';
        this.element.innerHTML = c;
        container.appendChild(this.element);

        this.update = function() {
          if (_this.y > 800) {
            _this.y = 80 + Math.random() * 4;
            _this.x = _this.range[0] + Math.random() * _this.range[1];
          }
          _this.y += _this.v.y;
          _this.x += _this.v.x;
          this.element.style.opacity = 1;
          this.element.style.transform = 'translate3d(' + _this.x + 'px, ' + _this.y + 'px, 0px)';
          this.element.style.webkitTransform = 'translate3d(' + _this.x + 'px, ' + _this.y + 'px, 0px)';
          this.element.style.mozTransform = 'translate3d(' + _this.x + 'px, ' + _this.y + 'px, 0px)';
        };
      }

      function animate() {
        for (var i in circles) {
          circles[i].update();
        }
        requestAnimationFrame(animate);
      }
      
      if (Math.random() < 0.001) {
        animate();
      }

      
    </script>
  </body>
</html>
`
