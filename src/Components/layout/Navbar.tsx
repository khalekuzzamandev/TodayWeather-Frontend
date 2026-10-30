import Image from 'next/image';
import NavTheme from '../Theme/NavTheme';


const Navbar = () => {
  return (
    <div className='flex justify-between items-center px-5 border border-b-blue-600 py-2'>
      <div>
     <Image
     src='/assets/TodayWeather.png'
     alt='TodayWeather'
     width={180}
     height={180}/>

      </div>
      <div>
        item
      </div>
      <div className='flex justify-center items-center gap-2'>
        <NavTheme/>
      </div>
    </div>
  );
};

export default Navbar;