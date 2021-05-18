# Deploy Django Application (Non-Dockerize)

To deploy your Django Application in Porter. You need to tweak something on your Django Application.

> 📘 Prerequisites
> - Django Application
> - Docker Registry integration on your account ([See docs](https://docs.getporter.dev/docs/linking-an-existing-docker-container-registry))


## Prepare Django Application

1. Install `django-allow-cidr` (Django middleware to enable the use of CIDR IP ranges in `ALLOWED_HOSTS`)
  ```sh
  pip install django-allow-cidr
  ```
2.  Go to Django Settings and add os.environ.get in allowed host.
  ```python
  ALLOWED_HOSTS = os.environ.get("DJANGO_ALLOWED_HOSTS", default='127.0.0.1').split(" ")
  ```
3. Add this below allowed host. Put CIDR according to the K8s kubelet CIDR
  ```python
  ALLOWED_CIDR_NETS = os.environ.get("ALLOWED_CIDR_NETS", default='10.0.0.0/16').split(" ")
  ```
4. Add `django-allow-cidr` middleware on the top of Django middleware:
  ```python
  MIDDLEWARE = [
    'allow_cidr.middleware.AllowCIDRMiddleware',
    #'django.middleware.security.SecurityMiddleware',
  ]
  ```
5. Add Gunicorn
  ```sh
  pip install gunicorn
  ```
6. Add static folder and add your HTML and CSS files. Locate static URL settings and add static file dirs below:
  ```python
  STATICFILES_DIRS = (
    os.path.join(BASE_DIR, 'static'),
  )
  STATIC_ROOT = os.path.join(BASE_DIR, 'staticfiles')
  ```
7. Add Procfile and add this:
  ```
web: gunicorn <project-name>.wsgi -b 0.0.0.0:8989 --timeout 120 
  
For example: 
  
web: gunicorn djangosample.wsgi -b 0.0.0.0:8989 --timeout 120
  ```
8. Then pip freeze requirements
  ```sh
  pip freeze > requirements.txt
  ```
  Reference:
    https://github.com/jimcru21/porter-sample-django-non-docker

## Deploy Django in Porter

1. Click Web Service then Launch Template
2. Name your application. ex. django-sample

  ![image](https://user-images.githubusercontent.com/52728901/118363487-16c41280-b5c7-11eb-8abb-c3065b9bde76.png)
  
3. In Deployment Method. Connect git repo. After that, select repo. ( ex. porter-sample-django-non-docker )

  ![image](https://user-images.githubusercontent.com/52728901/118363563-918d2d80-b5c7-11eb-8d72-200c68132e4e.png)

4. Click Main then continue

  ![image](https://user-images.githubusercontent.com/52728901/118363600-bda8ae80-b5c7-11eb-9ee7-9d6c821b4b34.png)

  ![image](https://user-images.githubusercontent.com/52728901/118363620-cd27f780-b5c7-11eb-8d8e-3b7a5be6ad22.png)

5. Click web then choose an image destination ( ex. mine is aws (see image) )

  ![image](https://user-images.githubusercontent.com/52728901/118363671-0f513900-b5c8-11eb-8592-ce9ba44ea1f3.png)
  
  ![image](https://user-images.githubusercontent.com/52728901/118363692-2db73480-b5c8-11eb-8420-cf05a8cabf44.png)

6. Then in Destination, just leave it default.
7. In Additional settings, specify the container port that you use in gunicorn in Procfile ( ex. 8989). 
   You can configure your domain, click Configure Custom Domain then put your desire domain name (im using the default porter domain)
   
   ![tempsnip](https://user-images.githubusercontent.com/52728901/118364073-8a671f00-b5c9-11eb-9b15-cfe53b1db7bf.png)

8. In Environment. Put DJANGO_ALLOWED_HOSTS that we specify on django settings. Then input your domain that you put in Configure Custom Domain.

    ![image](https://user-images.githubusercontent.com/52728901/118364222-28f38000-b5ca-11eb-9ce3-94b24f3f43b7.png)

9. Click Deploy then wait for buildpack to finish and push to porter. (You can see it on your repository under the Action tab )

  ![image](https://user-images.githubusercontent.com/52728901/118364697-209c4480-b5cc-11eb-8b06-d9a4a1a89143.png)
