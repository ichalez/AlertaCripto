# AlertaCripto

Monitor de RSI (Relative Strength Index) en tiempo real para Bitcoin, Ethereum, Cardano y Solana.

## 🚀 Características

- **RSI de 14 periodos**: Calculado sobre velas de 5 minutos.
- **Visualización en tiempo real**: Datos en vivo vía WebSockets de Binance.
- **Medidores Visuales**: Gráficos circulares que indican el nivel de RSI (0-100).
- **Sistema de Alertas**:
    - 🔴 **Rojo (Cruce Bajista)**: El RSI cae por debajo de 70 desde arriba (Sobrecarga de compra debilitándose).
    - 🟢 **Verde (Cruce Alcista)**: El RSI sube por encima de 30 desde abajo (Sobrecarga de venta recuperándose).
- **Diseño Glassmorphism**: Estética moderna y fluida.
- **Despliegue en Subdirectorio**: Configurado para funcionar en `/AlertaCripto`.

## 🐳 Despliegue con Docker

```bash
docker-compose up -d
```
La aplicación estará disponible en `http://localhost:3002/AlertaCripto`.

## 🚀 Despliegue en Coolify

1. **URL del Repositorio**: `https://github.com/ichalez/AlertaCripto`
2. **Build Pack**: Dockerfile
3. **Puerto Expuesto**: 80
4. **URL de Destino**: `http://192.168.68.200/AlertaCripto`

## 🛠️ Tecnologías

- HTML5 / CSS3 (Variables, Flexbox, Grid, SVG)
- JavaScript Vanilla
- Binance API & WebSockets
- Nginx Alpine
