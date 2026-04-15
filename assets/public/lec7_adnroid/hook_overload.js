Java.perform(
    () => {
        console.log('Start');
        const regex_patterm = Java.use('java.util.regex.Pattern');
        const result = regex_patterm.compile.overload('java.lang.String');
        result.implementation = (x) =>{
            return result.call(regex_patterm, '.*')
        }
    }
)