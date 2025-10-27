import typescript from 'rollup-plugin-typescript2'

export default {
  input: './src/app.ts',
  output: {
    file: './dist/app.js',
    format: 'es',
    sourcemap: true
  },
  plugins: [
    typescript({
      tsconfig: './tsconfig.json',
      clean: true
    })
  ],
  external: [
    '@builderbot/bot',
    '@builderbot/provider-baileys',
    'openai',
    'dotenv',
    'path',
    'fs',
    'url',
    'http',
    'https'
  ]
}
