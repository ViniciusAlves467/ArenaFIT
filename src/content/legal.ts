/**
 * Termos de Uso e Política de Privacidade do ArenaFit.
 * Versão elaborada para o projeto de TCC — revisar com a orientação antes de publicar na loja.
 * Itens entre colchetes devem ser preenchidos pela equipe.
 */

export interface LegalSection {
  title: string;
  paragraphs: string[];
}

export interface LegalDoc {
  title: string;
  updatedAt: string;
  version: string;
  intro: string;
  sections: LegalSection[];
}

export const PRIVACY_VERSION = '2026-11';

export const PRIVACY: LegalDoc = {
  title: 'Política de Privacidade',
  updatedAt: '2 de novembro de 2026',
  version: PRIVACY_VERSION,
  intro:
    'Esta política explica quais dados o ArenaFit coleta, por que coleta e como você controla essas informações, conforme a Lei Geral de Proteção de Dados (Lei nº 13.709/2018 — LGPD).',
  sections: [
    {
      title: '1. Quem é o controlador',
      paragraphs: [
        'O ArenaFit é um projeto acadêmico (Trabalho de Conclusão de Curso) desenvolvido por [nomes da equipe], [instituição de ensino]. A equipe é a controladora dos dados pessoais tratados no aplicativo.',
        'Contato do encarregado (DPO): [e-mail de contato].',
      ],
    },
    {
      title: '2. Dados que coletamos',
      paragraphs: [
        'Cadastro: o login é feito exclusivamente com a sua conta Google. Recebemos do Google apenas nome, e-mail, foto e um identificador da conta; o ArenaFit não cria nem armazena senha.',
        'Perfil: nome de exibição, nome de usuário, avatar e itens de personalização. Essas informações são visíveis para outros usuários.',
        'Dados corporais: data de nascimento, sexo (ou "prefiro não informar"), altura e peso. Eles nunca são exibidos a outras pessoas.',
        'Treinos: tipo de atividade, exercícios, cargas, repetições, duração, distância, título e a pontuação calculada.',
        'Foto do check-in: imagem enviada por você para validar o treino nos grupos.',
        'Localização: coordenadas do aparelho no momento do check-in, somente quando um grupo do qual você participa exige localização.',
        'Interações: grupos, votos de validação, conquistas, compras de itens virtuais e preferências do app.',
      ],
    },
    {
      title: '3. Para que usamos',
      paragraphs: [
        'Operar o aplicativo: criar sua conta, registrar treinos, montar rankings e grupos.',
        'Calcular a pontuação: os dados corporais servem exclusivamente para formar a população estatística de comparação (pessoas de perfil parecido). Eles não geram pontos e não representam avaliação médica.',
        'Validar check-ins: a foto, o emoji do dia e a confirmação de localização permitem que os membros do grupo aprovem ou reprovem o treino.',
        'Lembretes: notificações locais, configuradas por você, agendadas no próprio aparelho.',
        'Pesquisa acadêmica: estatísticas agregadas e anonimizadas podem ser apresentadas no TCC. Nenhum dado identificável é publicado.',
      ],
    },
    {
      title: '4. Bases legais',
      paragraphs: [
        'Execução do serviço que você solicitou (art. 7º, V) para cadastro, treinos, grupos e rankings.',
        'Consentimento específico e destacado (art. 11, I) para os dados corporais e de atividade física, que podem ser considerados dados pessoais sensíveis referentes à saúde. Você dá esse consentimento no cadastro e pode revogá-lo excluindo a conta.',
        'Consentimento (art. 7º, I) para localização e notificações, solicitados pelo sistema operacional apenas quando necessários.',
      ],
    },
    {
      title: '5. Com quem compartilhamos',
      paragraphs: [
        'Outros usuários: veem seu perfil público, sua posição nos rankings e — apenas nos grupos de que você participa — seus check-ins com foto. A localização exata nunca é exibida: o grupo vê somente o selo "local verificado".',
        'Operadores: Supabase (banco de dados, autenticação e armazenamento, hospedado na região de São Paulo) e, se você usar, Google (login). Esses fornecedores tratam os dados apenas para prestar o serviço.',
        'Não vendemos dados nem os usamos para publicidade.',
      ],
    },
    {
      title: '6. Por quanto tempo guardamos',
      paragraphs: [
        'Enquanto sua conta existir. Ao excluir a conta, seus dados, fotos, check-ins e votos são apagados de forma definitiva. Cópias de segurança do provedor são eliminadas no ciclo de retenção dele.',
      ],
    },
    {
      title: '7. Seus direitos',
      paragraphs: [
        'Você pode, a qualquer momento: confirmar e acessar seus dados; corrigir dados incompletos (Configurações → Dados corporais); exportar uma cópia completa (Configurações → Exportar meus dados); revogar o consentimento e eliminar seus dados (Configurações → Excluir minha conta).',
        'Para outros pedidos, fale com o encarregado pelo e-mail informado no item 1.',
      ],
    },
    {
      title: '8. Segurança',
      paragraphs: [
        'Conexões criptografadas (HTTPS), controle de acesso por usuário em cada tabela do banco (Row Level Security), fotos em armazenamento privado com links temporários e cálculo de pontos feito no servidor.',
      ],
    },
    {
      title: '9. Crianças e adolescentes',
      paragraphs: [
        'O cadastro é permitido a partir de 13 anos. Menores de 18 anos devem usar o aplicativo com o consentimento de um dos pais ou responsável legal (art. 14).',
      ],
    },
    {
      title: '10. Alterações',
      paragraphs: ['Se esta política mudar de forma relevante, avisaremos no aplicativo antes que a nova versão entre em vigor.'],
    },
  ],
};

export const TERMS: LegalDoc = {
  title: 'Termos de Uso',
  updatedAt: '2 de novembro de 2026',
  version: PRIVACY_VERSION,
  intro: 'Ao criar uma conta no ArenaFit você concorda com estes termos. Leia com atenção.',
  sections: [
    {
      title: '1. O que é o ArenaFit',
      paragraphs: [
        'Um aplicativo gratuito, desenvolvido como projeto acadêmico, que incentiva a prática de atividade física com check-ins, grupos, rankings, níveis e conquistas.',
      ],
    },
    {
      title: '2. Não é orientação médica',
      paragraphs: [
        'As pontuações são um modelo de gamificação. Elas não avaliam sua saúde, capacidade física ou condicionamento. Consulte um profissional de saúde antes de iniciar ou intensificar exercícios e respeite os limites do seu corpo.',
      ],
    },
    {
      title: '3. Sua conta',
      paragraphs: [
        'Você é responsável pelas informações que fornece e pela segurança da conta Google usada para entrar. Uma pessoa, uma conta.',
        'É necessário ter pelo menos 13 anos. Menores de 18 anos precisam do consentimento de um responsável.',
      ],
    },
    {
      title: '4. Check-ins honestos',
      paragraphs: [
        'Registre apenas treinos que você realmente fez, com dados verdadeiros. Fotos devem ser suas, tiradas no dia, e mostrar o emoji do dia quando o grupo exigir.',
        'Os membros do grupo podem reprovar check-ins suspeitos. Check-ins reprovados perdem os pontos do grupo e deixam de contar nas estatísticas.',
      ],
    },
    {
      title: '5. Conteúdo proibido',
      paragraphs: [
        'Não envie fotos com nudez, violência, terceiros sem autorização, dados pessoais de outras pessoas ou qualquer conteúdo ilegal, ofensivo ou discriminatório. Não use nomes de usuário ou de grupos ofensivos.',
        'Contas que violarem estas regras podem ser suspensas e o conteúdo removido.',
      ],
    },
    {
      title: '6. Grupos',
      paragraphs: [
        'Quem cria um grupo é o dono: define as regras de validação, pode editar o grupo, remover membros e excluí-lo. Ao excluir um grupo, seus rankings e check-ins publicados nele deixam de existir.',
      ],
    },
    {
      title: '7. Moedas e itens virtuais',
      paragraphs: [
        'Moedas, níveis, títulos e cosméticos não têm valor monetário, não podem ser trocados por dinheiro nem transferidos entre contas, e podem ser ajustados para manter o equilíbrio do jogo.',
      ],
    },
    {
      title: '8. Disponibilidade',
      paragraphs: [
        'Por ser um projeto acadêmico, o serviço é oferecido "no estado em que se encontra" e pode passar por mudanças, instabilidades ou ser encerrado ao fim do projeto, com aviso prévio no aplicativo.',
      ],
    },
    {
      title: '9. Privacidade',
      paragraphs: ['O tratamento dos seus dados está descrito na Política de Privacidade, que faz parte destes termos.'],
    },
    {
      title: '10. Contato',
      paragraphs: ['Dúvidas, denúncias ou pedidos: [e-mail de contato].'],
    },
  ],
};
