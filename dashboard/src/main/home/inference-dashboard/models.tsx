export const models = {
  "gpt-2": {
    name: "GPT-2",
    icon: "https://cdn-avatars.huggingface.co/v1/production/uploads/1620805164087-5ec0135ded25d76864d553f1.png",
    description:
      "GPT-2 is a large transformer-based language model. This is the smallest version of GPT-2, with 124M parameters.",
    tags: ["text-to-text", "CPU"],
  },
  "llama-3-8b-instruct": {
    name: "Llama 3 8B Instruct",
    icon: "https://1000logos.net/wp-content/uploads/2021/10/Meta-Symbol.png",
    description:
      "Llama 3 is an auto-regressive language model that uses an optimized transformer architecture. The tuned versions use supervised fine-tuning (SFT) and reinforcement learning with human feedback (RLHF) to align with human preferences for helpfulness and safety.",
    tags: ["text-to-text", "A100"],
  },
  "mistral-7b-instruct-v0-2": {
    name: "Mistral 7B Instruct v0.2",
    icon: "https://mistral.ai/images/news/announcing-mistral.png",
    description:
      "The Mistral-7B-Instruct-v0.2 Large Language Model (LLM) is an instruct fine-tuned version of the Mistral-7B-v0.2.",
    tags: ["text-to-text", "A100"],
  },
  "whisper-large-v3": {
    name: "Whisper Large v3",
    icon: "https://cdn-avatars.huggingface.co/v1/production/uploads/1620805164087-5ec0135ded25d76864d553f1.png",
    description:
      "Whisper is a pre-trained model for automatic speech recognition (ASR) and speech translation.",
    tags: ["audio-to-text", "A100"],
  },
  "stable-diffusion-2": {
    name: "Stable Diffusion 2",
    icon: "https://avatars.githubusercontent.com/u/100950301?s=200&v=4",
    description:
      "This is a model that can be used to generate and modify images based on text prompts. It is a Latent Diffusion Model that uses a fixed, pretrained text encoder (OpenCLIP-ViT/H).",
    tags: ["text-to-image", "A100"],
  },
  "musicgen-large": {
    name: "MusicGen Large",
    icon: "https://1000logos.net/wp-content/uploads/2021/10/Meta-Symbol.png",
    description:
      "MusicGen is a text-to-music model capable of genreating high-quality music samples conditioned on text descriptions or audio prompts. It is a single stage auto-regressive Transformer model trained over a 32kHz EnCodec tokenizer with 4 codebooks sampled at 50 Hz.",
    tags: ["text-to-audio", "A100"],
  },
};

export const tagColor = {
  "text-to-text": "#3f51b5",
  "audio-to-text": "#0E7F5D",
  "text-to-image": "#D67400",
  "text-to-audio": "#7020C0",
  CPU: "#72747E",
  A100: "#f50057",
};
