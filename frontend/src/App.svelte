<script lang="ts">
	import Navbar from "./partials/Navbar.svelte";
	export let name: string;
</script>

<main>
	<Navbar site_title={name}/>
	<h1>Hello {name}!</h1>
	<p>Visit the <a href="https://svelte.dev/tutorial">Svelte tutorial</a> to learn how to build Svelte apps.</p>
</main>

<style global lang="postcss">
	@tailwind base;
	@tailwind components;
	@tailwind utilities;
  </style>