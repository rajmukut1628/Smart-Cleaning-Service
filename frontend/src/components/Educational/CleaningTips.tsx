import { scrollToSection } from '../../utils/scrollToSection';
import { 
  LightBulbIcon, 
  ShieldCheckIcon,
  SparklesIcon,
  ClockIcon, BeakerIcon 
} from '@heroicons/react/24/outline';

const tips = [
  {
    category: 'General Cleaning',
    icon: SparklesIcon,
    color: 'bg-blue-500',
    tips: [
      {
        title: 'Start from Top to Bottom',
        description: 'Always clean from ceiling to floor to avoid redistributing dust and dirt.',
        difficulty: 'Beginner'
      },
      {
        title: 'Use Microfiber Cloths',
        description: 'Microfiber cloths trap dust and bacteria better than regular cloths.',
        difficulty: 'Beginner'
      },
      {
        title: 'Clean Regularly',
        description: 'Regular cleaning prevents buildup and makes deep cleaning easier.',
        difficulty: 'Beginner'
      }
    ]
  },
  {
    category: 'Kitchen Cleaning',
    icon: BeakerIcon,
    color: 'bg-blue-500',
    tips: [
      {
        title: 'Degrease with Baking Soda',
        description: 'Make a paste with baking soda and water to remove tough grease stains.',
        difficulty: 'Intermediate'
      },
      {
        title: 'Clean Appliances Weekly',
        description: 'Regular appliance cleaning prevents buildup and extends their lifespan.',
        difficulty: 'Beginner'
      },
      {
        title: 'Sanitize Cutting Boards',
        description: 'Use separate boards for meat and vegetables, sanitize with bleach solution.',
        difficulty: 'Intermediate'
      }
    ]
  },
  {
    category: 'Bathroom Hygiene',
    icon: ShieldCheckIcon,
    color: 'bg-blue-500',
    tips: [
      {
        title: 'Prevent Mold Growth',
        description: 'Keep bathroom well-ventilated and dry surfaces after use.',
        difficulty: 'Beginner'
      },
      {
        title: 'Disinfect High-Touch Areas',
        description: 'Daily disinfection of handles, faucets, and toilet seats is crucial.',
        difficulty: 'Beginner'
      },
      {
        title: 'Deep Clean Grout',
        description: 'Use hydrogen peroxide and baking soda to clean and whiten grout.',
        difficulty: 'Advanced'
      }
    ]
  },
  {
    category: 'Health & Safety',
    icon: LightBulbIcon,
    color: 'bg-blue-500',
    tips: [
      {
        title: 'Proper Ventilation',
        description: 'Always ensure good ventilation when using cleaning chemicals.',
        difficulty: 'Beginner'
      },
      {
        title: 'Read Chemical Labels',
        description: 'Never mix different cleaning products - it can create dangerous gases.',
        difficulty: 'Beginner'
      },
      {
        title: 'Use Natural Alternatives',
        description: 'Vinegar, lemon, and baking soda are effective natural cleaners.',
        difficulty: 'Intermediate'
      }
    ]
  }
];

const categoryId = (category: string) => 'tips-' + category.toLowerCase().replace(/[^a-z0-9]+/g, '-');
export default function CleaningTips() {
  const count = tips.reduce((total, category) => total + category.tips.length, 0);
  return <div className="tips-studio"><header className="tips-hero"><div className="tips-hero-glow" aria-hidden="true"/><div className="tips-hero-copy"><p className="tips-eyebrow"><SparklesIcon className="h-3.5 w-3.5"/>Your everyday care guide</p><h1>Cleaning Tips &amp; Best Practices<span>.</span></h1><p>Learn professional cleaning techniques and maintain a healthy environment</p><div className="tips-hero-counts"><span>{count} practical tips</span><span>{tips.length} focused topics</span></div></div><div className="tips-live-art" aria-hidden="true"><div className="tips-art-ring"/><div className="tips-art-core"><SparklesIcon/></div><span className="tips-art-node node-one"><BeakerIcon/></span><span className="tips-art-node node-two"><ShieldCheckIcon/></span><span className="tips-art-node node-three"><LightBulbIcon/></span><i className="tips-particle particle-one"/><i className="tips-particle particle-two"/><i className="tips-particle particle-three"/></div></header>
    <nav aria-label="Cleaning tip topics" className="tips-topic-nav">{tips.map(category=><button key={category.category} onClick={()=>scrollToSection(categoryId(category.category))}><category.icon className="h-4 w-4"/><span>{category.category}</span><small>{category.tips.length}</small></button>)}</nav>
    <div className="tips-category-grid">{tips.map((category, categoryIndex)=><section id={categoryId(category.category)} key={category.category} className="tips-category"><div className="tips-category-heading"><span className="tips-category-icon"><category.icon className="h-5 w-5"/></span><div><p>TOPIC 0{categoryIndex+1}</p><h2>{category.category}</h2></div><span className="tips-topic-count">{category.tips.length} tips</span></div><div className="tips-card-list">{category.tips.map((tip,index)=><article key={tip.title} className="tips-card" style={{animationDelay:`${(categoryIndex*3+index)*40}ms`}}><span className="tips-card-number">0{index+1}</span><div className="min-w-0 flex-1"><div className="tips-card-title"><h3>{tip.title}</h3><span className={'tips-level level-'+tip.difficulty.toLowerCase()}>{tip.difficulty}</span></div><p>{tip.description}</p></div></article>)}</div></section>)}</div>
    <section className="tips-hygiene"><div className="tips-hygiene-intro"><span className="tips-hygiene-icon"><ShieldCheckIcon className="h-7 w-7"/></span><div><h2>Hygiene Awareness</h2><p>Maintaining proper hygiene is essential for health and well-being. Regular cleaning and disinfection help prevent the spread of germs, bacteria, and viruses.</p></div></div><div className="tips-hygiene-grid">{[{icon:ClockIcon,title:'Daily Habits',text:'Develop consistent cleaning routines'},{icon:SparklesIcon,title:'Proper Techniques',text:'Use correct methods and products'},{icon:ShieldCheckIcon,title:'Health Benefits',text:'Reduce illness and allergies'}].map(item=><article key={item.title}><item.icon className="h-4 w-4"/><div><h3>{item.title}</h3><p>{item.text}</p></div></article>)}</div></section>
  </div>;
}
