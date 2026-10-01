# Área Viva

Uma pequena aplicação web, sem dependências de build, para estimar áreas a partir de uma fotografia usando amostragem de Monte Carlo.

## Como usar

1. Abra `index.html` no navegador e envie uma imagem.
2. Informe uma distância real que apareça na foto (por exemplo, uma trena de 1 metro) e clique nas duas extremidades dela.
3. Clique em **Contornar área** e marque os vértices da região. Clique novamente no ponto inicial para fechar o contorno.
4. A ferramenta sorteia 12.000 pontos no retângulo envolvente e estima a área em metros quadrados.

> A estimativa pressupõe que a área esteja em um plano aproximadamente paralelo à câmera. Para melhores resultados, fotografe de cima e evite perspectiva, inclinação e lentes muito angulares.
