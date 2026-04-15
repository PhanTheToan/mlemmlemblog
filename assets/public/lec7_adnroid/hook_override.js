Java.perform(
    ()=>{
        const Activity = Java.use('com.android.insecurebankv2.PostLogin');
        Activity.doesSuperuserApkExist.implementation = function (x) {
            return true;
        };
    }
);