# Vencito

<img src="assets/img/icon.svg" alt="Ícono de Vencito" width="96" align="right">

**Vencito** es una app para iPhone y iPad que lee la fecha de vencimiento de una foto del envase y te avisa antes de que se venza. Todo se procesa en el dispositivo: sin cuentas, sin servidores propios, sin publicidad.

*Vencito is an iPhone and iPad app that reads the expiration date from a photo of the package and reminds you before it expires. Everything runs on-device: no accounts, no servers of its own, no ads.*

- 🌐 Sitio · Website: **https://diegokelya.github.io/vencito/**
- 🔒 [Política de privacidad · Privacy policy](https://diegokelya.github.io/vencito/privacy.html)
- 🛟 [Soporte · Support](https://diegokelya.github.io/vencito/support.html) · [Issues](https://github.com/diegokelya/vencito/issues)

## Qué hay en este repo · What's in this repo

Este es el repositorio **público** de Vencito: el sitio del producto (GitHub Pages), la política de privacidad, la página de soporte y el canal de reportes. El código de la app es privado.

*This is Vencito's **public** repository: the product website (GitHub Pages), privacy policy, support page and issue tracker. The app's source code is private.*

```
index.html        Sitio en español · Spanish landing page
en/index.html     Sitio en inglés · English landing page
privacy.html      Política de privacidad (ES/EN) — URL para App Store Connect
support.html      Soporte (ES/EN) — URL para App Store Connect
assets/           Estilos, script del demo, ícono y capturas
```

## URLs para App Store Connect

| Campo | URL |
|---|---|
| Support URL | `https://diegokelya.github.io/vencito/support.html` |
| Marketing URL | `https://diegokelya.github.io/vencito/` |
| Privacy Policy URL | `https://diegokelya.github.io/vencito/privacy.html` |

## Publicar cambios · Publishing

GitHub Pages sirve la rama `main` desde la raíz (*Settings → Pages → Deploy from a branch → main / (root)*). Cada push a `main` actualiza el sitio en uno o dos minutos. No hay build: es HTML, CSS y JS plano.

Las tipografías (Familjen Grotesk, Onest y Doto, licencia OFL) están en `assets/fonts/`: el sitio no hace pedidos a terceros.

Para ver el sitio localmente: `python3 -m http.server` y abrir http://localhost:8000.

## Licencia · License

Contenido y código del sitio bajo licencia MIT. "Vencito" y el ícono son marcas del autor.
