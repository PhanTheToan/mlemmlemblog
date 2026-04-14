Java.perform(
    () => {
        const pattern = Java.use('java.util.regex.Pattern');
        const regex_change = pattern.compile.overload('java.lang.String');
        regex_change.implementation = function(x) {
            return regex_change.call(this, '.*');
        }
    }
);