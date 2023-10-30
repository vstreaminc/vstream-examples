# VStream CLI

This example demonstrates how to create a command-line application with VStream's public API.

## Getting Started

### Prerequisites

- Register a VStream app client and note your `client_id` and `client_secret`
  - Your client will need a `localhost` redirect URI on a port of your choice, such as `http://localhost:3000`
- [Install Node.js](https://nodejs.org/en/download)
- [Install PNPM](https://pnpm.io/installation)

### Step 1. Clone this repository:

```sh
git clone https://github.com/vstreaminc/vstream-examples.git
cd vstream-examples
```

### Step 2. Install dependencies

```sh
cd examples/vstream-cli
pnpm install
```

### Step 3. Build the application

```sh
pnpm build
```

### Step 4. Configure your client

```sh
pnpm vstream configure
> ? Enter your client ID <your_client_id>
> ? Enter your client secret <your_client_secret>
> ? Enter your OAuth redirect port - http://localhost: (3000) <your_client_redirect_port>
```

OR:

```sh
pnpm vstream configure \
  --client-id <your_client_id> \
  --client-secret <your_client_secret> \
  --port <your_client_redirect_port>
```

### Step 5. Login to VStream via OAuth

```sh
pnpm vstream login
> ? Select OAuth scopes (Press <space> to select, <a> to toggle all, <i> to invert selection, and <enter> to proceed)
> ❯◯ openid
>  ◯ profile
>  ◯ offline_access
>  ...
```

After you select the OAuth scopes you want to use, your web browser will open. Log in to VStream
(if needed) and then click the "Authorize" button on the OAuth consent screen.

You should be redirected to a screen that says "You may now close this window and return to the CLI.".

On your CLI, you should now see a "Login successful!" message.

### View available CLI commands

To view a list of available CLI commands, run:

```sh
pnpm vstream help
```

To view details about a specific command:

```sh
pnpm vstream help configure
```

OR:

```sh
pnpm vstream configure --help
```
