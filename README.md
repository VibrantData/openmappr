mappr - a network analysis and visualization platform.

## How to run via docker

### Pre-run setup(Do this if you're running for first time, or if there are any changes to the code)
1) `docker-compose stop` - stops the running services, if any.
2) `docker-compose build` - build the relevant images. Required if any of the source file changes. It takes awhile so be patient

### Run openmappr
* `docker-compose up` - start the various services and get the project running. Once the project is running, open http://localhost:8080 and login as `user@mappr.io` with password `woot`.

Note:- This is actually a server running, so don't kill the terminal unless you want to exit.

### Exit openmappr
* Press 'Ctrl-C' at the terminal to exit.


## Sever-side Organization
Code is divided into top level modules, each with routes, controllers, models and services. (if needed)

### Top Level Modules

* auth            - user authentication, includes passport config.
* common          - common elements like auth middlewares, permission middleware.
* commonOps       - commonOps module. has its own Readme.md file.
* config          - all common / dev / prod / testing config is made available as a module.
* data_api        - module for data api. makes networks available through the API
* datasys         - central data wrangling module. upload data, CRUD on dataset and networks.
* etl             - ETL pipeline. houses the ETL engine which runs scripts on spark cluster
* libs            - external libs outside of npm, mostly copy pasted code
* migrators       - migration code. Used when schema is changed, or need to run system wide validations
* misc_controllers- small controllers which interface with a service. like job / elasticsearch / svg / maintenance controllers
* models          - (depreciated -> contains schema for the old db. Used by survey and hence not removed)
* orgs            - module for organization management.
* player          - module for player managment. also contains a top_router for player specific routes
* project         - project module. cloning, deleting and so on.
* recipe          - Recipe Engine module. each individual stage has its own file.
* schemas         - All schemas are here. This is because I feel they might be shared across multiple projects
* scriptStore     - contains script runner to run generic scripts on data. depreciated
* services        - common Services needed by all modules
* snapshot        - snapshot module.
* survey          - survey module
* user            - user management module
* utils           - common utility functions. Also contains parsing code.

### Top Level files
- main_server.js - the server initialization code.
- main_router.js - Each modules furnishes its own router. Which is combined together in the this file.
- admin_router.js - similar to main_routers, for adminstrator account.
- misc_routes.js - bunch of routes, connecting misc_controllers
- routes.js - all routes which have not been ported over.
- ../server.js - entry point. Ensures node 5 is running.

# Running
Node 5 or greater needs to be installed. see below section on how to install it.
## developers
there are 2 scripts for running dev version

* run_local_mode.sh - the most common. run the server in local mode
* run_test_mode.sh - runs the server in testing mode. mostly for testing apis and other things.

# NODE 5 guide

since we have multiple projects spanning different version of nodes, it is best to use a node version manager

* remove all global packages
```
npm ls -gp --depth=0 | awk -F/node_modules/ '{print $2}' | grep -vE '^(npm)$' | xargs npm -g rm
```

* remove node -
depends on how you installed it. if brew, then do
```
brew uninstall node
brew prune
```
if not brew follow:
```
http://stackoverflow.com/questions/5650169/uninstall-node-js-using-linux-command-line
```

* install nvm from https://github.com/creationix/nvm. follow the guide. DO not use brew to install it.

also, when editing ~/.bashrc, ~/.profile, ~/.zprofile, or ~/.zshrc, use below:
```
export NVM_DIR="$HOME/.nvm"
export NVM_SYMLINK_CURRENT="true" # for editors to work properly
[ -s "$NVM_DIR/nvm.sh" ] && . "$NVM_DIR/nvm.sh" # This loads nvm
```
also, if using zsh, update ~/.zshenv or ~/.zprofile instead of ~/.zshrc

* install node
```
nvm install 5.0
nvm install 0.12
nvm use 5.0
nvm alias default node
```
* set default node
```
echo 5 > ~/.nvmrc
```
* install basic packages
```
npm install -g yo bower grunt-cli
```

# Sass
Sass and Compass need to be installed in order for sass to compile to css.

* make sure ruby is installed first (by default on macs)

* install sass
```
gem install sass
```
[Sass install](http://sass-lang.com/install)

* install Compass
```
gem install compass
```
[Compass install](http://compass-style.org/install/)
