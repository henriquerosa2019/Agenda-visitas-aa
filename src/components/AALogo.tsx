import React from 'react';

interface AALogoProps {
  className?: string;
  size?: number;
}

export const AALogo: React.FC<AALogoProps> = ({ className = '', size = 130 }) => {
  return (
    <div
      className={`inline-flex items-center justify-center select-none ${className}`}
      style={{ width: size, height: size }}
    >
      <svg
        viewBox="0 0 400 400"
        className="w-full h-full drop-shadow-sm"
        xmlns="http://www.w3.org/2000/svg"
      >
        <defs>
          {/* Definição dos Arcos Curvos para o Texto */}
          {/* Arco Esquerdo: UNIDADE (subindo de baixo para o topo) */}
          <path
            id="path-unidade"
            d="M 68 280 A 156 156 0 0 1 155 58"
            fill="none"
          />

          {/* Arco Direito: SERVIÇO (descendo do topo para a direita) */}
          <path
            id="path-servico"
            d="M 245 58 A 156 156 0 0 1 332 280"
            fill="none"
          />

          {/* Arco Inferior: RECUPERAÇÃO (curvando pela base do círculo) */}
          <path
            id="path-recuperacao"
            d="M 65 300 A 156 156 0 0 0 335 300"
            fill="none"
          />
        </defs>

        {/* Círculo de Fundo Branco */}
        <circle cx="200" cy="200" r="195" fill="#FFFFFF" />

        {/* Anel Externo Azul Marinho / Roxo Oficial */}
        <circle
          cx="200"
          cy="200"
          r="190"
          fill="none"
          stroke="#221768"
          strokeWidth="10"
        />

        {/* Triângulo Equilátero Central */}
        <polygon
          points="200,22 352,285 48,285"
          fill="#221768"
          stroke="#221768"
          strokeWidth="3"
        />

        {/* Símbolo "AA" em Arcos Arredondados com Travessão Central com Serifa */}
        <g fill="#FFFFFF">
          {/* Letra 'A' da Esquerda */}
          {/* Corpo externo do arco e pernas */}
          <path
            d="
              M 136 268
              L 136 140
              A 28 28 0 0 1 192 140
              L 192 268
              L 176 268
              L 176 226
              L 152 226
              L 152 268
              Z
            "
          />
          {/* Janela Superior do 'A' */}
          <path
            d="
              M 152 208
              L 176 208
              L 176 140
              A 12 12 0 0 0 152 140
              Z
            "
            fill="#221768"
          />
          {/* Travessão com saliência característica (serifa central) */}
          <rect x="130" y="208" width="68" height="18" fill="#FFFFFF" />

          {/* Letra 'A' da Direita */}
          {/* Corpo externo do arco e pernas */}
          <path
            d="
              M 208 268
              L 208 140
              A 28 28 0 0 1 264 140
              L 264 268
              L 248 268
              L 248 226
              L 224 226
              L 224 268
              Z
            "
          />
          {/* Janela Superior do 'A' */}
          <path
            d="
              M 224 208
              L 248 208
              L 248 140
              A 12 12 0 0 0 224 140
              Z
            "
            fill="#221768"
          />
          {/* Travessão com saliência característica (serifa central) */}
          <rect x="202" y="208" width="68" height="18" fill="#FFFFFF" />
        </g>

        {/* Textos Curvados ao Redor do Triângulo */}
        {/* UNIDADE */}
        <text
          fill="#221768"
          fontSize="26"
          fontWeight="900"
          fontFamily="system-ui, -apple-system, 'Segoe UI', Roboto, sans-serif"
          letterSpacing="4"
        >
          <textPath
            href="#path-unidade"
            startOffset="50%"
            textAnchor="middle"
          >
            UNIDADE
          </textPath>
        </text>

        {/* SERVIÇO */}
        <text
          fill="#221768"
          fontSize="26"
          fontWeight="900"
          fontFamily="system-ui, -apple-system, 'Segoe UI', Roboto, sans-serif"
          letterSpacing="4"
        >
          <textPath
            href="#path-servico"
            startOffset="50%"
            textAnchor="middle"
          >
            SERVIÇO
          </textPath>
        </text>

        {/* RECUPERAÇÃO */}
        <text
          fill="#221768"
          fontSize="27"
          fontWeight="900"
          fontFamily="system-ui, -apple-system, 'Segoe UI', Roboto, sans-serif"
          letterSpacing="4"
        >
          <textPath
            href="#path-recuperacao"
            startOffset="50%"
            textAnchor="middle"
          >
            RECUPERAÇÃO
          </textPath>
        </text>
      </svg>
    </div>
  );
};

