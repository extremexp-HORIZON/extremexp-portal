# ExtremeXP portal

## Overview

The ExtremeXP portal acts as the main entry point for all ExtremeXP users. A registered user of the Portal can access both a Graphical (Experiments tab) and the Textual Editors (Tasks tab - aka DSL Editor) to design and specify workflows and experiments.

## Installation Instructions - Local Deployment

1. Make sure that Docker is installed in your system and that the Docker deamon is running.
2. Copy the `.env.docker` file to `.env` and modify the environment variables as needed.

```bash
cp .env.docker .env
# Generate random secret keys for Flask apps
sed -i "s/^PROXY_APP_SECRET_KEY=SET_ME$/PROXY_APP_SECRET_KEY=$(openssl rand -hex 32)/" .env
sed -i "s/^FLASK_AC_APP_SECRET_KEY=SET_ME$/FLASK_AC_APP_SECRET_KEY=$(openssl rand -hex 32)/" .env
```

3. Start keycloak server first to configure it.

```bash
docker compose up keycloak
```

4. Once you notice "Keycloak ... started in ...", you can visit [the extremexp client in the extremxp realm](http://localhost:8080/admin/master/console/#/extremexp/clients/8274cd37-322a-4cbe-b822-ee64f5eb3ab6/settings). You will have to login with the credentials you specified (likely `admin`/`admin`).
5. Enable the `Authorization` setting an save. It's not enabled as the default settings cannot be imported automatically.
6. In the credentials tab, regenerate the client secret and copy it to the `OIDC_RP_CLIENT_SECRET` environment variable (for example in your `.env` file).

```bash
export CLIENT_SECRET="PASTE_YOUR_CLIENT_SECRET_HERE"
sed -i "s/^OIDC_RP_CLIENT_SECRET=SET_ME$/OIDC_RP_CLIENT_SECRET=$CLIENT_SECRET/" .env
export CLIENT_SECRET=""
```

7. Start the other services.

```bash
docker compose up
```

8. Access the app via <http://localhost/>

## Rebuilding

```bash
docker compose build
```

## API not running on localhost?

To deploy the framework on a server with an IP that is not localhost, you need to change the `VITE_API_URL` for the frontend HTTP request in `web-app/.env`, and rebuild the frontend.

## Demo

**Network Deployment:**

![newtwork_structure](./demo_images/network_and_authentication.v1.png)

**Login**

![login](./demo_images/1.login.png)

**Dashboard:**

![dashboard experiments](./demo_images/2.dashboard-experiments-overview.png)
![dashboard experiments deletion](./demo_images/3.dashboard-experiments-deletion.png)
![dashboard tasks](./demo_images/4.dashboard-tasks-overview.png)

**Editor:**

![editor](./demo_images/6.editor-drag-to-add-composite-task.png)
![editor composite task editing](./demo_images/7.editor-composite-task-editing.png)
![editor label editing](./demo_images/8.editor-label-editing.png)
![editor task config panel](./demo_images/9.editor-task-config-panel-name-editing.png)
![editor task variant selection](./demo_images/10.editor-task-config-panel-variant-selection.png)
![editor add task variant](./demo_images/11.editor-task-config-panel-add-variant.png)
![editor model save](./demo_images/12.editor-model-save.png)
![editor model save as](./demo_images/13.editor-model-save-as.png)

## License

This project is licensed under the Apache License, Version 2.0. See the [LICENSE](./LICENSE) file for details.

## Acknowledgements

The ExtremeXP project is co-funded by the European Union Horizon Program HORIZON CL4-2022-DATA-01-01, under Grant Agreement No. 101093164
